// index.js

/**
*  Copyright (C) 2012 10gen Inc.
*
*  This program is free software: you can redistribute it and/or  modify
*  it under the terms of the GNU Affero General Public License, version 3,
*  as published by the Free Software Foundation.
*
*  This program is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU Affero General Public License for more details.
*
*  You should have received a copy of the GNU Affero General Public License
*  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(function() {

var URL_TEMPLATE = "http://<%=host%>/<%=database%>/$cmd/?filter_storageDetails=<%=collection%>" +
                   "&filter_analyze=pagesInRAM" +
                   // "<%=(extent) ? '&filter_extent=' + extent : ''%>" +
                   "<%=(granularity) ? '&filter_granularity=' + (granularity * 1024) : ''%>" +
                   "<%=(numberOfChunks) ? '&filter_numberOfChunks=' + numberOfChunks : ''%>";

var REQUEST_FORM_FIELDS = [
    { name: 'host', desc: 'host', type: 'text', default_: 'localhost:28017' },
    { name: 'database', desc: 'db', type: 'text', default_: 'test' },
    { name: 'collection', desc: 'collection', type: 'text', default_: 'test' },
    // { name: 'extent', desc: 'extent (opt)', type: 'text', default_: '' },
    { name: 'granularity', desc: 'granularity (Kb) (opt)', type: 'text', default_: '20' },
    { name: 'numberOfChunks', desc: 'number of chunks (opt)', type: 'text', default_: '' }
]

function layoutHacks() {
    console.log('hacks');
    d3.selectAll('.chunksGraph')
        .style('max-width', window.document.documentElement.clientWidth - 110);
}

function setUp() {
    var requestForm = d3.select('#requestForm');
    base.generateFormFields(requestForm, REQUEST_FORM_FIELDS, function() {
        var reqParams = base.collectFormValues(requestForm, REQUEST_FORM_FIELDS);
        console.log(reqParams);
        var url = base.tmpl(URL_TEMPLATE, reqParams);
        d3.select('#resultString').text('fetching ' + url + '...');
        base.jsonp(url, 'handleData');
    });

    var $extentSummaryRow = d3.select('#extentSummaryRow');
    var $spaceFiller = d3.select('#spaceFiller');

    d3.select(window).on('resize', layoutHacks);
}

this.handleData = function handleData(data) {
    _data = data.rows[0];
    if (!_data.ok) {
        d3.select('#resultString').text('error: ' + _data.errmsg);
        return;
    }
    d3.select('#resultString').text('executed command with params ' + JSON.stringify(data.query) +
                                    ', rendering');
    console.log(_data);

    d3.select('#resultString').text('executed command ' + JSON.stringify(data.query));

    var basicInfoRow = d3.select('#basicInfoRow');
    basicInfoRow.selectAll('*').remove();

    d3.selectAll('.extentRow').remove();

    var SUMMARY_BAR_WIDTH = 20;
    var BAR_HEIGHT = 70;
    var BAR_WIDTH = 4;

    if (_data.extents) {
        var extentRowEnter = d3.select('#container')
            .selectAll('.extentRow')
            .data(_data.extents)
            .enter()
            .append('div')
            .attr('class', function(d, i) { return 'extentRow-' + i })
            .classed('grid-tr extentRow', true);

        extentRowEnter.append('div')
            .classed('grid-td left-table-header', true)
            .append('span')
            .text(function(d, i) { return 'extent ' + (i + 1) });

        var extentSummarySvg = extentRowEnter.append('div')
            .classed('grid-td extentSummary', true)
            .append('svg')
            .attr('width', SUMMARY_BAR_WIDTH + 1)
            .attr('height', BAR_HEIGHT + 1);

        extentSummarySvg.append('rect')
            .classed('border', true)
            .attr('width', SUMMARY_BAR_WIDTH)
            .attr('height', BAR_HEIGHT);

        var summaryY = d3.scale.linear().domain([0, 1]).range([BAR_HEIGHT, 0]);
        var summaryHeight = summaryY.copy().range([0, BAR_HEIGHT]);

        extentSummarySvg.selectAll('rect.inRAM')
            .data(function(d, i) { return [d.inMem] })
            .enter()
            .append('rect')
            .classed('inRAM', true)
            .attr('width', SUMMARY_BAR_WIDTH)
            .attr('height', summaryHeight)
            .attr('y', summaryY);

        extentRowEnter.append('div')
            .classed('grid-td chunksGraph', true)
            .append('svg')
            .attr('height', BAR_HEIGHT + 30)
            .attr('width', function(d) {
                return d.chunks ? d.chunks.length * BAR_WIDTH + 20 : 0
            })
            .append('g')
            .attr('transform', 'translate(10, 0)')
            .call(chunksInRAMPlot().chunkWidth(BAR_WIDTH).height(BAR_HEIGHT));


    } else {
        d3.select('#resultString').text('single extent mode is not supported yet');
    }

    layoutHacks();
};

function chunksInRAMPlot() {

    base.property(chart, 'chunkWidth', 2);
    base.property(chart, 'height', 80);

    function chart(g) {
        g.each(function(data) {
            var g = d3.select(this);
            console.log(data);

            if (!data.chunks) {
                return;
            }

            var length = data.chunks.length;
            console.log(length);

            var x = d3.scale.linear().domain([0, length]).range([0, length * chart._chunkWidth]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .tickValues(d3.range(0, data.chunks.length, 16))
                .tickSubdivide(1)
                .tickFormat(function(d) { return base.fmt.suffix(d * data.chunkBytes) })
                .orient('bottom');

            g.append('g')
                .attr('transform', 'translate(0, ' + (chart._height) + ')')
                .classed('x axis', true)
                .call(xAxis);

            g.append('svg:path')
                .classed('frame', true)
                .attr('d', 'M0,' + chart._height + 'V0' + 'h' + x(length) + 'v' + chart._height);

            var y = d3.scale.linear().domain([0, 1]).range([chart._height, 0]);
            var height = y.copy().range([0, chart._height]);

            g.selectAll('rect.chunk')
                .data(function(d, i) { return d.chunks })
                .enter()
                .append('rect')
                .classed('chunk', true)
                .attr('x', function(d, i) { return x(i) })
                .attr('width', chart._chunkWidth)
                .attr('y', y)
                .attr('height', height);
        });
    }

    return chart;
}

setUp();

})();
