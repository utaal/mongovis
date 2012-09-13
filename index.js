// index.js

/**
*    Copyright (C) 2012 10gen Inc.
*
*    This program is free software: you can redistribute it and/or  modify
*    it under the terms of the GNU Affero General Public License, version 3,
*    as published by the Free Software Foundation.
*
*    This program is distributed in the hope that it will be useful,
*    but WITHOUT ANY WARRANTY; without even the implied warranty of
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*    GNU Affero General Public License for more details.
*
*    You should have received a copy of the GNU Affero General Public License
*    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function handleFiles(files) {
    var reader = new FileReader();
    var text = reader.readAsText(files[0]);
    reader.onload = (function(file) {
        var data = JSON.parse(file.target.result);
        render(data);
        document.getElementById("json").innerHTML = JSON.stringify(data);
    });
}

function render(data) {
    var BAR_SIZE = 6;
    var BAR_HEIGHT = 150;
    for (var i = 0; i < data.extents.length; ++i) {
        var extentData = data.extents[i];
        var extentchart = d3.select("#graphs").append("svg")
            .attr("class", "extent-chart")
            .attr("width", BAR_SIZE * extentData.chunks.length)
            .attr("height", BAR_HEIGHT);
        var enter = extentchart.selectAll("rect").data(extentData.chunks)
            .enter()
        enter.append("rect")
                .attr("class", "bsonSize")
                .attr("x", function(d, i) { console.log(i); return i * BAR_SIZE })
                .attr("width", BAR_SIZE)
                .attr("height", function(d, i) { console.log(d); return BAR_HEIGHT * d.bsonSize / d.onDiskSize })
        enter.append("rect")
                .attr("class", "recSize")
                .attr("x", function(d, i) { console.log(i); return i * BAR_SIZE })
                .attr("width", BAR_SIZE)
                .attr("y", function(d, i) { return BAR_HEIGHT * d.bsonSize / d.onDiskSize })
                .attr("height", function(d, i) { return BAR_HEIGHT * (d.recSize - d.bsonSize) / d.onDiskSize });
    }

}
