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
var SIZE_BAR_HEIGHT = 50;
var SUMMARY_BAR_WIDTH = 20;

var _data = null;

function percentStr(val) {
  return (val * 100).toFixed(2);
}

var bsonSizeToDiskSizeRatio = function(d) {
  return d.bsonSize / d.onDiskSize;
}

var nonBsonRecSizeToDiskSizeRatio = function(d) {
  return (d.recSize - d.bsonSize) / d.onDiskSize;
}

var avgRecSize = function(d) {
  return d.recSize / d.numEntries;
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

function computeBoundaries(arr, func, minIsZero) {
  var all = arr.map(func).filter(function(d) { return !isNaN(d); });
  return {
    min: minIsZero ? 0 : Math.min.apply(null, all),
    max: Math.max.apply(null, all),
    ranged: function(val) {
      return ((val - this.min) / (this.max - this.min));
    }
  }
}

function computeCharactBoundaries(arr) {
  return computeBoundaries(arr, function(ex) {
    return ex.charactSum / ex.charactCount;
  }, false);
}

function computeSizeBoundary(arr) {
  return computeBoundaries(arr, avgRecSize, true);
}

function render(data, barSize) {
  //TODO(andrea.lattuada) refactor
  if (data.extents) {
    var summaryGraphs = d3.select("#summaryGraphs");
    appendDescDiv(summaryGraphs, "collection", data, "coll-desc");
    var allChunks = _.flatten(
        data.extents.map(function(ex) { return ex.chunks }));
    var charactBoundaries = computeCharactBoundaries(allChunks);
    var sizeBoundary = computeSizeBoundary(allChunks);
    for (var i = 0; i < data.extents.length; ++i) {
      var extentData = data.extents[i];
      renderExtent(i, extentData, barSize, charactBoundaries, sizeBoundary);
      var collSummaryExtent = summaryGraphs.append("a")
        .attr("onclick", "highlightExtent(" + i + "); return true;")
        .attr("href", "#extent" + i).append("div")
        .attr("class", "extent-summary");
      renderGraph(collSummaryExtent, [extentData], SUMMARY_BAR_WIDTH,
                  charactBoundaries, sizeBoundary);
    }
  } else if (data.chunks) {
    var charactBoundaries = computeCharactBoundaries(data.chunks);
    var sizeBoundary = computeSizeBoundary(data.chunks);
    renderExtent("", data, barSize, charactBoundaries, sizeBoundary);
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
      "avg. record size: " + (data.recSize / data.numEntries).toFixed(4) + "<br/>" +
      "(% of ext used: " + percentStr(data.recSize / data.onDiskSize) + ")<br/>" +
      "BSONs size: " + data.bsonSize + "<br/>" +
      "(% of ext used: " + percentStr(data.bsonSize / data.onDiskSize) + ")<br/>" +
      "padding: " + (data.recSize / data.bsonSize).toFixed(4) + "<br/>" +
      "avg. charact. (age?): " +
          (data.charactSum / data.charactCount).toFixed(4) + "<br/>");
}

function renderExtent(extentNum, extentData, barSize, charactBoundaries,
                      sizeBoundary) {
  var extentDiv = d3.select("#graphs").append("a")
    .attr("name", "extent" + extentNum).append("div").attr("class", "extent");
  renderGraph(extentDiv.append("div"), [extentData], SUMMARY_BAR_WIDTH,
                      charactBoundaries, sizeBoundary);
  appendDescDiv(extentDiv, "extent " + extentNum, extentData, "extent-desc");
  renderGraph(extentDiv.append("div"), extentData.chunks, barSize,
                    charactBoundaries, sizeBoundary);
}

function renderGraph(div, arr, barSize, charactBoundaries, sizeBoundary) {
  var EXTENT_PADDING = 1;
  var chunkOnDiskSizes = arr.map(function (d) {
    return d.onDiskSize;
  });
  var maxChunkLength = d3.max(chunkOnDiskSizes);
  var fullWidth = d3.sum(chunkOnDiskSizes) / maxChunkLength * barSize +
                  arr.length + EXTENT_PADDING;
  var extentChartAvgSize = div.append("svg")
    .attr("class", "extent-chart extent-chart-avgsize")
    .attr("width", fullWidth)
    .attr("height", SIZE_BAR_HEIGHT);
  var extentChart = div.append("svg")
    .attr("class", "extent-chart extent-chart-usage")
    .attr("width", fullWidth)
    .attr("height", BAR_HEIGHT);
  var extentChartCharact = div.append("svg")
    .attr("class", "extent-chart extent-chart-charact")
    .attr("width", fullWidth)
    .attr("height", AGE_BAR_HEIGHT);
  var x = function() {
    var nextX = 0;
    return function (d, i) {
      var curX = nextX;
      nextX += barSize * d.onDiskSize / maxChunkLength + 1;
      return curX + EXTENT_PADDING;
    };
  };
  var avgsizey = d3.scale.linear()
    .domain([0, 1])
    .range([0, SIZE_BAR_HEIGHT]);
  var characty = d3.scale.linear()
    .domain([0, 1])
    .range([0, AGE_BAR_HEIGHT]);
  var y = d3.scale.linear()
    .domain([0, 1])
    .range([0, BAR_HEIGHT]);
  var xsize = function (d, i) {
    return d.onDiskSize / maxChunkLength * barSize;
  }
  extentChartAvgSize.selectAll("rect").data(arr)
    .enter().append("rect")
    .attr("class", "avgSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", function(d) {
      return avgsizey(1) - avgsizey(sizeBoundary.ranged(avgRecSize(d)));
    })
    .attr("height", function(d) {
      return avgsizey(sizeBoundary.ranged(avgRecSize(d)));
    });
  var enter = extentChart.selectAll("rect").data(arr).enter();
  enter.append("rect")
    .attr("class", "bsonSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("height", _.compose(y, bsonSizeToDiskSizeRatio));
  enter.append("rect")
    .attr("class", "recSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", _.compose(y, bsonSizeToDiskSizeRatio))
    .attr("height", _.compose(y, nonBsonRecSizeToDiskSizeRatio));
  extentChartCharact.selectAll("rect").data(arr)
    .enter().append("rect")
    .attr("class", "charact")
    .attr("x", x())
    .attr("width", xsize)
    // .attr("y", _.compose(characty, charactRatio(charactBoundaries)))
    .attr("height", _.compose(characty, charactRatio(charactBoundaries)));
  var xfunc = x();
  extentChartCharact.selectAll("g").data(arr)
    .enter().append("svg:g")
    .each(function (d, i) {
      var xpos = xfunc(d);
      if (!d.charactCount) {
        d3.select(this).append("rect")
          .attr("class", "missing-datum")
          .attr("x", xpos)
          .attr("width", xsize(d))
          .attr("height", 5)
          .attr("y", 10);
      }
    });
}
