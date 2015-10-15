
(function () {
 
    var scriptName = "gpsTrackwidget.js"; //name of this script, used to get reference to own tag
    var jQuery; //noconflict reference to jquery
    var jqueryPath = "http://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"; 
    var jqueryVersion = "1.11.0";
    var scriptTag; //reference to the html script tag
 
    /******** Get reference to self (scriptTag) *********/
    var allScripts = document.getElementsByTagName('script');
    var targetScripts = [];
    for (var i in allScripts) {
        var name = allScripts[i].src
        if(name && name.indexOf(scriptName) > 0)
            targetScripts.push(allScripts[i]);
    }
 
    scriptTag = targetScripts[targetScripts.length - 1];
 
    /******** load external scripts *********/
    function loadScript(src, onLoad) {
        var script_tag = document.createElement('script');
        script_tag.setAttribute("type", "text/javascript");
        script_tag.setAttribute("src", src);
 
        if (script_tag.readyState) {
            script_tag.onreadystatechange = function () {
                if (this.readyState == 'complete' || this.readyState == 'loaded') {
                    onLoad();
                }
            };
        } else {
            script_tag.onload = onLoad;
        }
        (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
    }
 
    /******** load external css  *********/
    function loadCss(href) {
        var link_tag = document.createElement('link');
        link_tag.setAttribute("type", "text/css");
        link_tag.setAttribute("rel", "stylesheet");
        link_tag.setAttribute("href", href);
        (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(link_tag);
    }

    loadScript("http://yangtai.senellart.com/js/ol.js");
    loadScript("http://www.openstreetmap.org/openlayers/OpenStreetMap.js");
    loadCss("http://openlayers.org/en/v3.5.0/css/ol.css");
    loadCss("http://yangtai.senellart.com/css/widget.css");
          
    /******** load jquery into 'jQuery' variable then call main ********/
    if (window.jQuery === undefined || window.jQuery.fn.jquery !== jqueryVersion) {
        loadScript(jqueryPath, initjQuery);
    } else {
        initjQuery();
    }

 /******** Called once jQuery has loaded ******/
    function initjQuery() {
      // Restore $ and window.jQuery to their previous values and store the
       // new jQuery in our local jQuery variable
        jQuery = window.jQuery.noConflict(true);
        main();
    }
 
    /******** starting point for widget ********/
    function main() {
        jQuery(document).ready(function ($) {
          
          var map, vector, iconVector;

          map = new ol.Map({
              target: 'map',
              layers: [
                new ol.layer.Tile({
                  source: new ol.source.OSM()
                })
              ],
              view: new ol.View({
                center: ol.proj.transform([2.346, 48.827], 'EPSG:4326', 'EPSG:3857'),
                zoom: 12
              })
          });

          vector = new ol.layer.Vector({
            style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: 'rgba(255,0,0,0.5)',
                width: 3
              })
            }) 
          });    

          iconVector = new ol.layer.Vector({
            style: new ol.style.Style({
              image: new ol.style.Icon({
                anchor:[0.5, 1],
                src:'http://www.openstreetmap.org/openlayers/img/marker.png'
              })
            })
          });
         
          function getFilenames(handleData){
            $.ajax({
              url: "http://yangtai.senellart.com/dataFTP/user1/",
              crossDomain: true,
              success: function(data){
                var filenames= [];
                $(data).find("a:contains(" + ".gpx" +")").each(function(){
                  var filename = this.href.replace(window.location.host, "").replace("http:///", "").replace(".gpx", "");
                  filenames.push(filename);                            
                });
                handleData(filenames);
              }              
            });
          }
                   
          getFilenames(function(output){
            //find most recent file          
            var max = Math.max.apply(null, output);
            maxStr = max.toString();
            maxStr = maxStr.substr(6,2) + "/" + maxStr.substr(4,2) + "/" + maxStr.substr(0,4);
          
            var info = document.getElementById("map");
            info.appendChild(document.createTextNode('Track date is: '+ maxStr));

            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", "http://yangtai.senellart.com//dataFTP/user1/"+max+".gpx", false);
            xmlhttp.send();

            var xmlDoc = xmlhttp.responseXML;
            var trkpt = xmlDoc.getElementsByTagName("trkpt");
            var coords = []; //format-transformed coordinates

            for (var i = 0; i < trkpt.length; i++){
                  coords.push(ol.proj.transform([parseFloat(trkpt[i].getAttribute("lon")), 
                  parseFloat(trkpt[i].getAttribute("lat"))], 'EPSG:4326', 'EPSG:3857'));
            }

            map.getView().setCenter(coords[0]);
   
            var feature = new ol.Feature({
                  geometry: new ol.geom.MultiLineString([coords])
            });

            var vectorSource = new ol.source.Vector({
                  features: [feature]
            });

            vector.setSource(vectorSource);

            var iconFeature = new ol.Feature({
                  geometry: new ol.geom.Point(coords[coords.length-1]),
                  name: 'Start Point'
            });

            var iconVectorSource = new ol.source.Vector({
                  features:[iconFeature]
            });
              
            iconVector.setSource(iconVectorSource);
            map.addLayer(vector);
            map.addLayer(iconVector);
          });
                  
    });

  }

})(); // call the anonymous function immediately
