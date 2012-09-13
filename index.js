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

var BAR_HEIGHT = 150;
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

function render(data, barSize) {
  //TODO(andrea.lattuada) refactor
  if (data.extents) {
    var summaryGraphs = d3.select("#summaryGraphs");
    appendDescDiv(summaryGraphs, "collection", data, "coll-desc");
    for (var i = 0; i < data.extents.length; ++i) {
      var extentData = data.extents[i];
      renderExtent(i, extentData, barSize);
      var collSummaryExtent = summaryGraphs.append("a")
        .attr("onclick", "highlightExtent(" + i + "); return true;")
        .attr("href", "#extent" + i).append("div");
      renderExtentSummary(collSummaryExtent, extentData,
          SUMMARY_BAR_WIDTH);
    }
  } else if (data.chunks) {
    renderExtent("", data, barSize);
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
      "padding: " + (data.recSize / data.bsonSize).toFixed(4));
}

function renderExtent(extentNum, extentData, barSize) {
  var extentDiv = d3.select("#graphs").append("a")
    .attr("name", "extent" + extentNum).append("div").attr("class", "extent");
  renderExtentSummary(extentDiv, extentData, SUMMARY_BAR_WIDTH);
  appendDescDiv(extentDiv, "extent " + extentNum, extentData, "extent-desc");
  renderExtentGraph(extentDiv, extentData, barSize);
}

function renderExtentSummary(div, extentData, barSize) {
  var extentsummary = div.append("svg")
    .attr("class", "extent-summary")
    .attr("width", barSize)
    .attr("height", BAR_HEIGHT);
  extentsummary.append("rect")
    .attr("class", "bsonSize")
    .attr("width", barSize)
    .attr("height", bsonSizeToDiskSizeRatio(extentData) * BAR_HEIGHT);
  extentsummary.append("rect")
    .attr("class", "recSize")
    .attr("width", barSize)
    .attr("y", bsonSizeToDiskSizeRatio(extentData) * BAR_HEIGHT)
    .attr("height", nonBsonRecSizeToDiskSizeRatio(extentData) * BAR_HEIGHT);
}

function renderExtentGraph(div, extentData, barSize) {
  var EXTENT_PADDING = 1;
  var chunkOnDiskSizes = extentData.chunks.map(function (d) {
    return d.onDiskSize
  });
  var maxChunkLength = d3.max(chunkOnDiskSizes);
  var extentchart = div.append("svg")
    .attr("class", "extent-chart")
    .attr("width", d3.sum(chunkOnDiskSizes) / maxChunkLength * barSize +
          extentData.chunks.length + EXTENT_PADDING)
    .attr("height", BAR_HEIGHT);
  var x = function() {
    var nextX = 0;
    return function (d, i) {
      var curX = nextX;
      nextX += barSize * d.onDiskSize / maxChunkLength + 1;
      return curX + EXTENT_PADDING;
    };
  };
  var y = d3.scale.linear()
    .domain([0, 1])
    .range([0, BAR_HEIGHT]);
  var xsize = function (d, i) {
    return d.onDiskSize / maxChunkLength * barSize;
  }
  var enter = extentchart.selectAll("rect").data(extentData.chunks).enter()
  enter.append("rect")
    .attr("class", "bsonSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("height", compose(y, bsonSizeToDiskSizeRatio))
  enter.append("rect")
    .attr("class", "recSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", compose(y, bsonSizeToDiskSizeRatio))
    .attr("height", compose(y, nonBsonRecSizeToDiskSizeRatio));
}
