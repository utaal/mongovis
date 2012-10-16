
/*
Copyright (C) 2012 10gen Inc.

This program is free software: you can redistribute it and/or  modify
it under the terms of the GNU Affero General Public License, version 3,
as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(function() {

var URL_TEMPLATE = "http://<%=host%>/<%=database%>/$cmd/?filter_indexStats=<%=collection%>" +
                   "&filter_name=<%=index%>";

var REQUEST_FORM_FIELDS = [
    { name: 'host', desc: 'host', type: 'text', default_: 'localhost:28017' },
    { name: 'database', desc: 'db', type: 'text', default_: 'test' },
    { name: 'collection', desc: 'collection', type: 'text', default_: 'test' },
    { name: 'index', desc: 'index', type: 'text', default_: '_id_' }
]

function setUp() {
    var requestForm = d3.select('#requestForm');
    base.generateFormFields(requestForm, REQUEST_FORM_FIELDS, function() {
        var url = base.tmpl(URL_TEMPLATE, base.collectFormValues(requestForm, REQUEST_FORM_FIELDS));
        d3.select('#resultString').text('fetching ' + url + '...');
        base.jsonp(url, 'handleData');
    });
}

var _data;

// expose so it can be invoked by the jsonp response script
this.handleData = function handleData(data) {
    _data = data.rows[0];
    if (!_data.ok) {
        d3.select('#resultString').text('error: ' + _data.errmsg);
        return;
    }
    d3.select('#resultString').text('executed command with params ' + JSON.stringify(data.query) +
                                    ', rendering');
    console.log(_data);

    _data.keyPattern = JSON.stringify(_data.keyPattern);
    d3.select('#resultString').text('executed command ' + JSON.stringify(data.query));

    var basicInfoRow = d3.select('#basicInfoRow');
    basicInfoRow.selectAll('*').remove();
    [
        'index "<%=name%>"',
        'key pattern: <%=keyPattern%>',
        'storage namespace: <%=storageNs%>',
        '<%=depth%> deep',
        'each bucket body is <%=bucketBodyBytes%> bytes',
        (_data.isIdIndex ? ' this is an _id index' : ' ')
    ].map(function(x) { basicInfoRow.append('div').classed('grid-td', true).text(base.tmpl(x, _data)) });

    var dataArrays = [[_data.overall], _data.perLevel, _data.expandedNodes];
    dataArrays.map(function(arr) {
        // generate calculated data fields
        if (arr) arr.map(function(x) {
            x.fillRatio = x.emptyRatio;
            x.fillRatio.mean = 1 - x.emptyRatio.mean;
        });
    });

    d3.select('#curNodeStats').datum(_data.overall).call(statsDisplay().big(true));
}

function statsDisplay() {

    function chart(selection) {
        selection.each(function(data) {
            var $this = d3.select(this);
            if (big) {
                $this.append('div').html(base.tmpl(
                    '<%=numBuckets%> buckets, on average <b><%=base.fmt.stat.percentAndErr(fillRatio)%></b> full' +
                    '<br/><b><%=base.fmt.stat.percentAndErr(keyNodeRatio)%></b> key nodes' +
                    ', <b><%=base.fmt.stat.percentAndErr(bsonRatio)%></b> bson keys'
                , data));
            }
        });
    }

    base.property(chart, 'big', false);

    return chart;
}

function boxPlot() {

    function chart(selection) {
        selection.each(function(data) {

        });
    }

    base.property(chart, 'big', false);

    return chart;
}

setUp();

})();
