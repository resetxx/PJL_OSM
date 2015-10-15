var map, vector, iconVector, startIconVector;
var gpxData;
var chart;
var firstIndex, lastIndex, startIndex, endIndex; //time index(00:00-23:59) where track begins

// clear previous displayed information 
function clearInfo(infoToClear){  
  var children = infoToClear.childNodes;
  if(children.length > 0){
    for(var i = 0; i < children.length; i++)
        infoToClear.removeChild(children[i]);
  }
}

//generate gpx data from selected date
function getGpxDataByDate(inputDate){

  var info = document.getElementById('info');
  clearInfo(info);

  //convert date format to get corresponding filename
  var date = inputDate.getFullYear() + ("0" + (inputDate.getMonth() + 1)).slice(-2) +  
    ("0" + inputDate.getDate()).slice(-2);
  var filepath = "http://yangtai.senellart.com//dataFTP/user1/"+date+".gpx";
  
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", filepath, false);
  xmlhttp.send();

  if (xmlhttp.status == 404){
      info.appendChild(document.createTextNode('No history for this date.'));
      chart.clear();
      return;
  }
  else{
      var xmlDoc = xmlhttp.responseXML;
      var trkpt = xmlDoc.getElementsByTagName("trkpt");
      var coords = []; //format-transformed coordinates
      var times = []; //hh:mm of each recorded position
      var coordsOri = []; // original coordinates

      //transform and store coordinates 
      for (var i = 0; i < trkpt.length; i++){
      coords.push(ol.proj.transform([parseFloat(trkpt[i].getAttribute("lon")), 
      parseFloat(trkpt[i].getAttribute("lat"))], 'EPSG:4326', 'EPSG:3857'));

      coordsOri.push([parseFloat(trkpt[i].getAttribute("lat")), 
      parseFloat(trkpt[i].getAttribute("lon"))]);

      times.push(xmlDoc.getElementsByTagName("time")[i+1].textContent.substr(11,5));
      //document.getElementById('test').innerHTML = time[1].;
      }     

      return [coords, times, coordsOri];
  }  
}

function createVector(inputGpxData, sTime, eTime){ 
    var duration = 800;
    var start = +new Date();
    var pan = ol.animation.pan({
      duration: duration,
      source: map.getView().getCenter(),
      start: start
    });
    var bounce = ol.animation.bounce({
      duration: duration,
      resolution: 1.5 * map.getView().getResolution(),
      start: start
    });
    map.beforeRender(pan, bounce);
    //document.getElementById("test").innerHTML = inputGpxData[0][0];
    map.getView().setCenter(inputGpxData[0][0]);
    //map.getView().setZoom(12);
    var indices = [];
    //get coords indexes between start time and end time
    for (var i = 0; i < inputGpxData[1].length; i++){
        if (inputGpxData[1][i] > sTime && inputGpxData[1][i] < eTime) 
          indices.push(i);
    } 
    
    if(indices.length == 0){
      var info = document.getElementById('info');
      clearInfo(info);
      info.appendChild(document.createTextNode('No history between this interval.'));
      setVector([]);
    }
    //pass part of coords to create vector layer
    else if(indices.length < inputGpxData[0].length){
      var gpxDataPart = inputGpxData[0].slice(indices[0], indices[indices.length - 1]+1);
      setVector(gpxDataPart);
      setStartIconVector(gpxDataPart);
      setEndIconVector(gpxDataPart);
    }
    else if(indices.length == inputGpxData[0].length){
      setVector(inputGpxData[0]);
      setStartIconVector(inputGpxData[0]);
      setEndIconVector(inputGpxData[0]);
    } 

}

function setStartIconVector(coords){
  var iconFeature = new ol.Feature({
      geometry: new ol.geom.Point(coords[0]),
      name: 'Start Point'
  });

  var iconVectorSource = new ol.source.Vector({
      features:[iconFeature]
  });
  
  startIconVector.setSource(iconVectorSource);
}

function setEndIconVector(coords){
  var iconFeature = new ol.Feature({
      geometry: new ol.geom.Point(coords[coords.length-1]),
      name: 'Start Point'
  });

  var iconVectorSource = new ol.source.Vector({
      features:[iconFeature]
  });
  
  iconVector.setSource(iconVectorSource);
}

function setVector(coords){
  var feature = new ol.Feature({
      geometry: new ol.geom.MultiLineString([coords])
  });

  var vectorSource = new ol.source.Vector({
      features: [feature]
  });

  vector.setSource(vectorSource);
}

function drawChart(inputChartData){
  //AmCharts.clear();
  chart = AmCharts.makeChart("chartdiv", {
    "type": "serial",
    "theme": "light",
    //"path": "http://www.amcharts.com/lib/3/",
    "dataProvider": inputChartData,
    "valueAxes": [{
        "position": "left",
        "title": "Accumulated Distance / km"
    }],
    "graphs": [{
        "id": "g1",
        "fillAlphas": 0.4,
        "valueField": "distances",
        "balloonText": "<div style='margin:5px; font-size:16px;'>Distance:<b>[[value]]</b> km</div>"
    }],
    "chartScrollbar": {
        "graph": "g1",
        "scrollbarHeight": 10,
        "backgroundAlpha": 0,
        "selectedBackgroundAlpha": 0.1,
        "selectedBackgroundColor": "#888888",
        "graphFillAlpha": 0,
        "graphLineAlpha": 0.5,
        "selectedGraphFillAlpha": 0,
        "selectedGraphLineAlpha": 1,
        "autoGridCount": true,
        "color": "#AAAAAA"
    },
    "mouseWheelZoomEnabled": true,
    "chartCursor": {
        "categoryBalloonDateFormat": "JJ:NN",
        "cursorPosition": "mouse"
    },
    "categoryField": "date",
    "categoryAxis": {
        "minPeriod": "mm",
        "parseDates": true
    }
  });

  //when cursor position is changed, get the index over which cursor currently is
  chart.addListener("changed", handleChange); 
  chart.addListener("zoomed", handleZoom);
}

function handleChange(event){    
    var hh = Math.floor(event.index / 60);
    hh = ("0" + hh).slice(-2);
    var mm = event.index % 60;
    mm = ("0" + mm).slice(-2);
    //document.getElementById("test").innerHTML = hh+ ' ' + mm;
    document.getElementById("endTime").value = hh + ":" + mm;

    map.removeLayer(iconVector);
    map.removeLayer(startIconVector);
    map.removeLayer(vector);

    if(startIndex < firstIndex && endIndex < firstIndex){
      var gpxDataPart = [];
    } 
    else if(event.index > firstIndex && startIndex < firstIndex && endIndex >= firstIndex && endIndex <= lastIndex){
      var gpxDataPart = gpxData[0].slice(0, event.index - firstIndex);
    } 
    else if(event.index > firstIndex && startIndex < firstIndex && endIndex > lastIndex){
      if (event.index <= lastIndex){
        var gpxDataPart = gpxData[0].slice(0, event.index - firstIndex);
      }else {
        var gpxDataPart = gpxData[0].slice(0, lastIndex - firstIndex);
      }
    } 
    else if(startIndex >= firstIndex && endIndex <= lastIndex){
      var gpxDataPart = gpxData[0].slice(startIndex - firstIndex, event.index - firstIndex);
    } 
    else if(startIndex >= firstIndex && endIndex > lastIndex){
      if (event.index <= lastIndex){
      var gpxDataPart = gpxData[0].slice(startIndex - firstIndex ,event.index - firstIndex);
    }else{
      var gpxDataPart = gpxData[0].slice(startIndex - firstIndex ,lastIndex - firstIndex);
    }
    } 
    else{
      var gpxDataPart = [];
    }

    setVector(gpxDataPart);
    setStartIconVector(gpxDataPart);
    setEndIconVector(gpxDataPart);

    map.addLayer(vector);
    map.addLayer(iconVector);
    map.addLayer(startIconVector);
}

function handleZoom(event){
  document.getElementById("startTime").value = event.startValue;
  document.getElementById("endTime").value = event.endValue;

  startIndex = event.startIndex;
  endIndex = event.endIndex;
  
  map.removeLayer(vector);
  map.removeLayer(startIconVector);
  map.removeLayer(iconVector);

  if(startIndex < firstIndex && endIndex < firstIndex){
    var gpxDataPart = [];
  } else if(startIndex < firstIndex && endIndex >= firstIndex && endIndex <= lastIndex){
    var gpxDataPart = gpxData[0].slice(0, endIndex - firstIndex);
  } else if(startIndex < firstIndex && endIndex > lastIndex){
    var gpxDataPart = gpxData[0].slice(0, lastIndex - firstIndex);
  } else if(startIndex >= firstIndex && endIndex <= lastIndex){
    var gpxDataPart = gpxData[0].slice(startIndex - firstIndex, endIndex - firstIndex);
  } else if(startIndex >= firstIndex && endIndex > lastIndex){
    var gpxDataPart = gpxData[0].slice(startIndex - firstIndex ,lastIndex - firstIndex);
  } else{
    var gpxDataPart = [];
  }

  setVector(gpxDataPart);
  setEndIconVector(gpxDataPart);
  setStartIconVector(gpxDataPart);

  map.addLayer(vector);
  map.addLayer(startIconVector);
  map.addLayer(iconVector);
  
}

function deg2rad(value){
    return value * Math.PI / 180;
}

//calculate distance between two points
function distance(lat1, lon1, lat2, lon2){
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);  // deg2rad above
  var dLon = deg2rad(lon2 - lon1);
  var a = 
     Math.sin(dLat/2) * Math.sin(dLat/2) + 
     Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
     Math.sin(dLon/2) * Math.sin(dLon/2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km

  if(isNaN(d))  d = 0;
  return d;
}

function generateChartData(inputGpxData) {
  var chartData = [];
  var distances = 0;
  firstIndex = 0; //time index where first track point occurs
  lastIndex =0;
  // current date
  var firstDate = new Date();
  firstDate.setHours(0);
  firstDate.setMinutes(0);

  var firstHour = inputGpxData[1][0].slice(0,2);
  var firstMinute = inputGpxData[1][0].slice(3);
  var endHour = inputGpxData[1].slice(-1)[0].slice(0,2);
  var endMinute = inputGpxData[1].slice(-1)[0].slice(3);

  for (var i = 0; i < 1440; i++) { //24h * 60 = 1440 min
      var newDate = new Date(firstDate);
      // each time add one minute
      newDate.setMinutes(newDate.getMinutes() + i);
      
      if(newDate.getHours() == firstHour && newDate.getMinutes() == firstMinute)
         firstIndex = i;

      if(newDate.getHours() == endHour && newDate.getMinutes() == endMinute)
         lastIndex = i;

      if(firstIndex > 0 && (i-firstIndex+1) < inputGpxData[0].length -1){

        var lat1 = inputGpxData[2][i-firstIndex+1][0];
        var lon1 = inputGpxData[2][i-firstIndex+1][1]; 
        var lat2 = inputGpxData[2][i-firstIndex][0];
        var lon2 = inputGpxData[2][i-firstIndex][1];          

        distances = distances + distance(lat1, lon1, lat2, lon2);          
      }
      
      // add data item to the array
      chartData.push({
        date: newDate,
        distances:distances.toFixed(2)
      });

  }
  //document.getElementById('test').innerHTML = firstIndex + ' '+lastIndex;
  return chartData;
}

function init(){ 
  $('#datePicker').datepick();
  document.getElementById('datePicker').addEventListener('click', reloadByDate);
  document.getElementById('startTime').addEventListener('change', reloadByInterval);
  document.getElementById('endTime').addEventListener('change', reloadByInterval);

  var sTime = document.getElementById("startTime").value;
  var eTime = document.getElementById("endTime").value;

  startIndex = 0;
  endIndex = 1439;

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
        src:'icon/marker.png'
      })
    })
  });

  startIconVector = new ol.layer.Vector({
    style: new ol.style.Style({
      image: new ol.style.Icon({
        anchor:[0.5, 0.8],
        src:"icon/marker1.png"
      })
    })
  });

  var date = new Date();
  gpxData = getGpxDataByDate(date);
  
  var chartData = generateChartData(gpxData);
  drawChart(chartData);

  createVector(gpxData, sTime, eTime);      
  map.addLayer(vector);
  map.addLayer(iconVector);
  map.addLayer(startIconVector);
}

function reloadByDate(){
  map.removeLayer(vector);
  map.removeLayer(iconVector);
  map.removeLayer(startIconVector);

  var date = new Date($(this).datepick('getDate'));
  gpxData = getGpxDataByDate(date);

  var chartData = generateChartData(gpxData);
  drawChart(chartData);

  document.getElementById("startTime").value = "00:00";
  document.getElementById("endTime").value = "23:59";

  createVector(gpxData, "00:00", "23:59");

  map.addLayer(vector);
  map.addLayer(iconVector);
  map.addLayer(startIconVector);
}

function reloadByInterval(){
  var info = document.getElementById('info');
  clearInfo(info);

  var infoTime = document.getElementById('infoTime');
  clearInfo(infoTime);
  
  var sTime = document.getElementById("startTime").value;
  var eTime = document.getElementById("endTime").value;  
  
  if(sTime > eTime){
    map.removeLayer(vector);
    map.removeLayer(iconVector);
    map.removeLayer(startIconVector);
    infoTime.appendChild(document.createTextNode('Start time is after end time!'));
  }else{
    map.removeLayer(vector);
    map.removeLayer(iconVector);
    createVector(gpxData, sTime, eTime);
    map.addLayer(iconVector);
    map.addLayer(vector);
  }

}
