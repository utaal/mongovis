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

var AGE_BAR_HEIGHT = 50;
var BAR_HEIGHT = 110;
var SUMMARY_BAR_WIDTH = 20;

var _data = null;

function compose(f, g) {
  return function(x) { return f(g(x)) }
}

function percentStr(val) {
  return (val * 100).toFixed(2);
}

var bsonSizeToDiskSizeRatio = function(d) {
  return d.bsonSize / d.onDiskSize;
}
var nonBsonRecSizeToDiskSizeRatio = function(d) {
  return (d.recSize - d.bsonSize) / d.onDiskSize;
}

var charactRatio = function(boundaries) {
  return function(d) {
    return boundaries.ranged(d.charactSum / d.charactCount);
  };
}

function handleFiles(files) {
  var reader = new FileReader();
  var text = reader.readAsText(files[0]);
  var barSize = + document.getElementById("barWidth").value;
  reader.onload = (function(file) {
    _data = JSON.parse(file.target.result);
    console.log(_data);
    render(_data, barSize);
  });
  d3.select("#fileSelect").style({display: "none"});
  d3.select("#render").style({display: null});
}

function handleRender() {
  var barSize = + document.getElementById("barWidth").value;
  d3.select("#graphs").selectAll("*").remove();
  d3.select("#summaryGraphs").selectAll("*").remove();
  render(_data, barSize);
}

function computeCharactBoundaries(arr) {
  var allCharact = arr.map(function(ex) {
    return ex.charactSum / ex.charactCount;
  }).filter(function(d) { return !isNaN(d) });
  return {
    min: Math.min.apply(null, allCharact),
    max: Math.max.apply(null, allCharact),
    ranged: function(val) {
      return ((val - this.min) / (this.max - this.min));
    }
  }
}


function render(data, barSize) {
  //TODO(andrea.lattuada) refactor
  if (data.extents) {
    var summaryGraphs = d3.select("#summaryGraphs");
    appendDescDiv(summaryGraphs, "collection", data, "coll-desc");
    var charactBoundaries = computeCharactBoundaries(
        _.flatten(data.extents.map(function(ex) { return ex.chunks })));
    for (var i = 0; i < data.extents.length; ++i) {
      var extentData = data.extents[i];
      renderExtent(i, extentData, barSize, charactBoundaries);
      var collSummaryExtent = summaryGraphs.append("a")
        .attr("onclick", "highlightExtent(" + i + "); return true;")
        .attr("href", "#extent" + i).append("div")
        .attr("class", "extent-summary");
      // var extentBarWidth = extentData.onDiskSize / 100000;
      // if (extentBarWidth < SUMMARY_BAR_WIDTH / 2) {
      //   extentBarWidth = SUMMARY_BAR_WIDTH / 2;
      // }
      renderExtentSummary(collSummaryExtent, extentData, SUMMARY_BAR_WIDTH,
                          charactBoundaries);
    }
  } else if (data.chunks) {
    var charactBoundaries = computeCharactBoundaries(data.chunks);
    renderExtent("", data, barSize, charactBoundaries);
  }
}

function highlightExtent(extentNum) {
  d3.selectAll(".extent").style({"background-color": null});
  d3.select("#graphs").select("a[name='extent" + extentNum + "']")
    .select("div").style({"background-color": "#ffc"});
}

function appendDescDiv(toElm, title, data, clazz) {
  toElm.append("div").attr("class", clazz).html(
      title + "<br/>" +
      "records: " + data.numEntries + "<br/>" +
      "records size: " + data.recSize + "<br/>" +
      "(% of ext used: " + percentStr(data.recSize / data.onDiskSize) + ")<br/>" +
      "BSONs size: " + data.bsonSize + "<br/>" +
      "(% of ext used: " + percentStr(data.bsonSize / data.onDiskSize) + ")<br/>" +
      "padding: " + (data.recSize / data.bsonSize).toFixed(4) + "<br/>" +
      "average charact. (age?): " +
          (data.charactSum / data.charactCount).toFixed(4) + "<br/>");
}

function renderExtent(extentNum, extentData, barSize, charactBoundaries) {
  var extentDiv = d3.select("#graphs").append("a")
    .attr("name", "extent" + extentNum).append("div").attr("class", "extent");
  renderExtentSummary(extentDiv.append("div"), extentData, SUMMARY_BAR_WIDTH,
                      charactBoundaries);
  appendDescDiv(extentDiv, "extent " + extentNum, extentData, "extent-desc");
  renderExtentGraph(extentDiv.append("div"), extentData, barSize,
                    charactBoundaries);
}

function renderExtentSummary(div, extentData, barSize, charactBoundaries) {
  renderGraph(div, [extentData], barSize, charactBoundaries);
}

function renderExtentGraph(div, extentData, barSize, charactBoundaries) {
  return renderGraph(div, extentData.chunks, barSize, charactBoundaries);
}

function renderGraph(div, arr, barSize, charactBoundaries) {
  var EXTENT_PADDING = 1;
  var chunkOnDiskSizes = arr.map(function (d) {
    return d.onDiskSize;
  });
  var maxChunkLength = d3.max(chunkOnDiskSizes);
  var fullWidth = d3.sum(chunkOnDiskSizes) / maxChunkLength * barSize +
                  arr.length + EXTENT_PADDING;
  var extentchartcharact = div.append("svg")
    .attr("class", "extent-chart extent-chart-charact")
    .attr("width", fullWidth)
    .attr("height", AGE_BAR_HEIGHT);
  var extentchart = div.append("svg")
    .attr("class", "extent-chart extent-chart-usage")
    .attr("width", fullWidth)
    .attr("height", BAR_HEIGHT);
  var x = function() {
    var nextX = 0;
    return function (d, i) {
      var curX = nextX;
      nextX += barSize * d.onDiskSize / maxChunkLength + 1;
      return curX + EXTENT_PADDING;
    };
  };
  var charactheight = d3.scale.linear()
    .domain([0, 1])
    .range([0, AGE_BAR_HEIGHT]);
  var characty = d3.scale.linear()
    .domain([1, 0])
    .range([0, AGE_BAR_HEIGHT]);
  var y = d3.scale.linear()
    .domain([0, 1])
    .range([0, BAR_HEIGHT]);
  var xsize = function (d, i) {
    return d.onDiskSize / maxChunkLength * barSize;
  }
  extentchartcharact.selectAll("rect").data(arr)
    .enter().append("rect")
    .attr("class", "charact")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", compose(characty, charactRatio(charactBoundaries)))
    .attr("height", compose(charactheight, charactRatio(charactBoundaries)));
  var xfunc = x();
  extentchartcharact.selectAll("g").data(arr)
    .enter().append("svg:g")
    .each(function (d, i) {
      var xpos = xfunc(d);
      console.log(i + ", " + xpos);
      if (!d.charactCount) {
        d3.select(this).append("rect")
          .attr("class", "missing-datum")
          .attr("x", xpos)
          .attr("width", xsize(d))
          .attr("height", 5)
          .attr("y", AGE_BAR_HEIGHT - 10);
      }
    });
  var enter = extentchart.selectAll("rect").data(arr).enter();
  enter.append("rect")
    .attr("class", "bsonSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("height", compose(y, bsonSizeToDiskSizeRatio));
  enter.append("rect")
    .attr("class", "recSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", compose(y, bsonSizeToDiskSizeRatio))
    .attr("height", compose(y, nonBsonRecSizeToDiskSizeRatio));
}
