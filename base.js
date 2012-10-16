
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

(function(){

d3.selection.prototype.value = function(val) {
    if (arguments.length < 1) return this.property('value');
    else this.property('value', val);
}

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
var cache = {};

this.Tmpl = function Tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
        cache[str] = cache[str] ||
            Tmpl(document.getElementById(str).innerHTML) :

        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).
        new Function("obj",
            "var p=[],print=function(){p.push.apply(p,arguments);};" +

            // Introduce the data as local variables using with(){}
            "with(obj){p.push('" +

            // Convert the template into pure JavaScript
            str
              .replace(/[\r\t\n]/g, " ")
              .split("<%").join("\t")
              .replace(/((^|%>)[^\t]*)'/g, "$1\r")
              .replace(/\t=(.*?)%>/g, "',$1,'")
              .split("\t").join("');")
              .split("%>").join("p.push('")
              .split("\r").join("\\'")
        + "');}return p.join('');");

    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
};

this.Jsonp = function(url, callbackName) {
    var script = document.createElement('script');
    script.src = url + "&limit=1&jsonp=" + callbackName;
    document.getElementsByTagName('body')[0].appendChild(script);
};

this.GenerateFormFields = function(selection, fields, onClick) {
    fields.map(function(x) {
        selection.append('label').attr('for', x.name).text(x.desc);
        var input = selection.append('input').attr('name', x.name).attr('type', x.type);
        if (x.default_) input.value(x.default_);
    });
    selection.append('button').text('submit').on('click', onClick);
};

this.CollectFormValues = function(selection, fields) {
    var params = {};
    fields.map(function(x) {
        params[x.name] = selection.select('input[name=' + x.name + ']').value();
    });
    return params;
};

})();
