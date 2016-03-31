//
(function(){

var attrArray = ["PerRuralPop", "PerAgLandArea", "PerArabLandArea",
                 "AvePrecip_mmperyr", "PerAgEmploy", "PerForestLand"];
var expressed = attrArray[0];

// scale to size bar
var yScale = d3.scale.linear()
    .range([463, 0])
    .domain([0, 110]);

var chartWidth = window.innerWidth * 0.335,
  chartHeight = 473,
  leftPadding = 30,
  rightPadding = 2,
  topBottomPadding = 5,
  chartInnerWidth = chartWidth - leftPadding - rightPadding,
  chartInnerHeight = chartHeight - topBottomPadding * 2,
  translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

  // load windows
window.onload = setMap();
// set up the choropleth map
function setMap () {
  // using queue.js
  var width = window.innerWidth * 0.6;
  var height = 400;

  // map container
  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);

  // alberts projection
  var projection = d3.geo.cylindricalEqualArea()
    //.center([0, 0]) //long and lat in the center of the plane
    .rotate([-10])  //long and lat -2,0
    //.parallels([29.5, 45.5])  //the standard parallels; one array tangent; two secant
    .scale(140)  //scales * distance [bwn points]
    .translate([width/2, height/2])
    .precision(.1);

  var path = d3.geo.path()
    .projection(projection);

  d3_queue.queue()
    .defer(d3.csv, "data/Lab2.csv") //load attributes from csv
    .defer(d3.json, "data/WorldCountries.topojson") //load contries spatial data

    .await(callback);

  function callback(error, csvData, world){

      setGraticule(map, path);
      // convert to geojson format
      var world = topojson.feature(world, world.objects.WorldCountries).features;
            //console.log(error);
            //console.log(csvData);
            //console.log(world);


           // join csv with spatial data
      world = joinData(world, csvData);
           //create the color scale
      var colorScale = makeColorScale(csvData);
      //
      // add enumeration units to the map
      setEnumerationUnits(world, map, path, colorScale);
      setChart(csvData, colorScale);
      createDropDown(csvData);

  };  // end callBack

};  // end setMap

//////////////////////////////
// define setGraticule function - graticule generator
function setGraticule(map, path) {
  var graticule = d3.geo.graticule()
      //.extent([[-120 - 45, 38 - 45], [-120 + 45, 38 + 45]])
      .step([15, 15]);

//background graticule
  var gratBackground = map.append("path")
      .datum(graticule.outline()) //bind graticule background
      .attr("class", "gratBackground") //assign class for styling
      .attr("d", path); //project graticule

  // draw graticule lines
  var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
     .data(graticule.lines()) //bind graticule lines to each element to be created
     .enter() //create an element for each datum
     .append("path") //append each element to the svg as a path element
     .attr("class", "gratLines") //assign class for styling
     .attr("d", path); //project graticule lines
};  // end setGraticule

////////////////
// funtion to join data from the csv and spatial data
function joinData(world, csvData){
  // for each country of the world

  for (var i =0; i < csvData.length; i++) {
     var csvCountry = csvData[i];
     //console.log (csvCountry);
     var csvKey = csvCountry.CountryID;  //country ID - key
     //console.log(world.length);
     // find the correspondent country for the csvKey
     for (var a=0; a<world.length; a++) {
       var worldProperties  = world[a].properties; //props of json worldMap
       var worldKeys = worldProperties.adm0_a3;  // key of worldMap
       //console.log (worldKeys);
       if (csvKey == worldKeys) {
         //perform the join; assign csv attributes to geojson
         //console.log(csvKey,"and ,",worldKeys );

         attrArray.forEach(function(attribute) {
           // strings to numbers; this changes null to NaN
           var val = parseFloat(csvCountry[attribute]);

           if (val && val != NaN){
             worldProperties[attribute] = val;
           };

         });
       };

     }; //end of finding the key

  }; // end of loop for all csv Data
  return world;
};

//////////  add countries to the map
function setEnumerationUnits(world, map, path, colorScale){

  var countries = map.selectAll(".countries")
     .data(world)
     .enter()
     .append("path")
     .attr("class", function(d){
       return "countries " + d.properties.adm0_a3;
     })
     .attr("d", path)
     .style("fill", function(d) {
        //return colorScale(d.properties[expressed]) //
        return choropleth(d.properties, colorScale)
     })
 		 .on("mouseover", function(d){
 			  highlight(d.properties);
 		 })
 		 .on("mouseout", function(d){
 		    dehighlight(d.properties);
 		 })
 		 .on("mousemove", moveLabel);

 	//add style descriptor to each path
 	var desc = countries.append("desc")
 		.text('{"stroke": "#000", "stroke-width": "0.5px"}');
};  // end setEnumeration units

//function to test for data value and return color
function choropleth(props, colorScale){
	//make sure attribute value is a number
	var val = parseFloat(props[expressed]);
  //console.log('val', val);
	//if attribute value exists, assign a color; otherwise assign gray
	if (val && val != NaN){
    //console.log('val', val);
    return colorScale(val);
	} else {
		return "#CCC";
	};
};  // end of choropleth


///////////////////////////////////
//function to create color scale generator
function makeColorScale(data){
	var colorClasses = [
		"#D4B9DA",
		"#C994C7",
		"#DF65B0",
		"#DD1C77",
		"#980043"
	];

  //  **** ONE OPTION - NATURAL BREAKS:
	//create color scale generator
	var colorScale = d3.scale.threshold()
		.range(colorClasses);

	//array the values of the expressed attribute
	var domainArray = [];
	for (var i=0; i<data.length; i++){
    ///////////////////////////////
		var val = parseFloat(data[i][expressed]);
    //console.log('val in scaling', val);
    //for null values
    if (val && val != NaN){
		     domainArray.push(val);
    }
  };

	//ckmeans clustering algorithm
  //to create natural breaks  -- ss is in statistics library
	var clusters = ss.ckmeans(domainArray, 5);
	//reset domain array to cluster minimums
	domainArray = clusters.map(function(d){
		return d3.min(d);
	});

	//remove first value from domain array to create class breakpoints
	domainArray.shift();
	//assign array of last 4 cluster minimums as domain
	colorScale.domain(domainArray);

  /*
  //OPTION 2
  //create color scale generator
  var colorScale = d3.scale.quantile()
      .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
  var minmax = [
      d3.min(data, function(d) { return parseFloat(d[expressed]); }),
      d3.max(data, function(d) { return parseFloat(d[expressed]); })
  ];
    //assign two-value array as scale domain
  colorScale.domain(minmax);
  console.log(colorScale.quantiles());
  */
  // OPTION 3 - QUANTILES
  //create color scale generator
  /*
  var colorScale = d3.scale.quantile()
      .range(colorClasses);

  //build array of all values of the expressed attribute
  var domainArray = [];
    for (var i=0; i<data.length; i++){
      var val = parseFloat(data[i][expressed]);
      if (val && val != NaN){
  		     domainArray.push(val);
      }
  };
    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
      */


  return colorScale;
};  // end color Scale generator - end makeColorScale
//// ----------------

//function to highlight enumeration units and bars
function highlight(props){
	//change stroke
	var selected = d3.selectAll("." + props.adm0_a3)
		.style({
			"stroke": "blue",
			"stroke-width": "2"
		});

	setLabel(props);
};  // end of highlight


//function to reset the element style on mouseout
function dehighlight(props){
	var selected = d3.selectAll("." + props.adm0_a3)
		.style({
			//"stroke": function(){
			//	return getStyle(this, "stroke")
			//},
			//"stroke-width": function(){
			//	return getStyle(this, "stroke-width")
			//}
      "stroke": "#FFF",
			"stroke-width": "0.5"
		});

	function getStyle(element, styleName){
		var styleText = d3.select(element)
			.select("desc")
			.text();

		var styleObject = JSON.parse(styleText);

		return styleObject[styleName];
	};
	//remove info label
	d3.select(".infolabel")
		.remove();
};  //end dehighlight

//function to move info label with mouse
function moveLabel(){
	//label width
	var labelWidth = d3.select(".infolabel")
		.node()
		.getBoundingClientRect()
		.width;

	//use coordinates of mousemove event to set label coordinates
	var x1 = d3.event.clientX + 10,
		y1 = d3.event.clientY - 75,
		x2 = d3.event.clientX - labelWidth - 10,
		y2 = d3.event.clientY + 25;

	//horizontal label coordinate, testing for overflow
	var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
	//vertical label coordinate, testing for overflow
	var y = d3.event.clientY < 75 ? y2 : y1;

	d3.select(".infolabel")
		.style({
			"left": x + "px",
			"top": y + "px"
		});
};  // end moveLabel


//function to create dynamic label
function setLabel(props){
	//label content
	var labelAttribute = "<h1>" + props[expressed] +
		"</h1><b>" + expressed + "</b>";

	//create info label div
	var infolabel = d3.select("body")
		.append("div")
		.attr({
			"class": "infolabel",
			"id": props.adm0_a3 + "_label"
		})
		.html(labelAttribute);

	var regionName = infolabel.append("div")
		.attr("class", "labelname")
		.html(props.name);
};  // end setLabel


////////////
//function to create coordinated bar chart
function setChart(csvData, colorScale){
  //chart frame dimensions

  //create a second svg element to hold the bar chart
  var chart = d3.select("body")
		.append("svg")
		.attr("width", chartWidth)
		.attr("height", chartHeight)
		.attr("class", "chart");

	//create a rectangle for chart background fill
	var chartBackground = chart.append("rect")
		.attr("class", "chartBackground")
		.attr("width", chartInnerWidth)
		.attr("height", chartInnerHeight)
		.attr("transform", translate);

	//bars world countries
	var bars = chart.selectAll(".bars")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b){   //sorts the classes bars
			return b[expressed]-a[expressed]
		})
		.attr("class", function(d){
			return "bars " + d.adm0_a3;
		})
		.attr("width", chartInnerWidth / csvData.length - 1)
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel);

	//add style descriptor to each rect
	var desc = bars.append("desc")
		.text('{"stroke": "none", "stroke-width": "0px"}');

	//create a text element for the chart title
	var chartTitle = chart.append("text")
		.attr("x", 40)
		.attr("y", 40)
		.attr("class", "chartTitle");

	//create vertical axis generator
	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient("left");

	//place axis
	var axis = chart.append("g")
		.attr("class", "axis")
		.attr("transform", translate)
		.call(yAxis);

	//create frame for chart border
	var chartFrame = chart.append("rect")
		.attr("class", "chartFrame")
		.attr("width", chartInnerWidth)
		.attr("height", chartInnerHeight)
		.attr("transform", translate);

	//set bar positions, heights, and colors
	updateChart(bars, csvData.length, colorScale);
};  // end setChart

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
	//position bars

  var allAttributes = ["Rural population (% of total pop)",
                  "Agricultural land (% of land area)","tres","cuatro","cinco","seis"];

  bars.attr("x", function(d, i){
			return i * (chartInnerWidth / n) + leftPadding;
		})
		//size/resize bars
		.attr("height", function(d, i){
			return 463 - yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d, i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
		//color/recolor bars
		.style("fill", function(d){
			return choropleth(d, colorScale);
		});

	//add text to chart title
	var chartTitle = d3.select(".chartTitle")
		.text(expressed + " per country");  //.text (exp);
}; //end updateChart

//////////////////////
//////////////////////
//function to create a dropdown menu for attribute selection
function createDropDown(csvData){
	//add select element
	var dropdown = d3.select("body")
		.append("select")
		.attr("class", "dropdown")
		.on("change", function(){
			changeAttribute(this.value, csvData)
		});

	//add initial option
	var titleOption = dropdown.append("option")
		.attr("class", "titleOption")
		.attr("disabled", "true")
		.text("Select Attribute");

	//add attribute name options
	var attrOptions = dropdown.selectAll("attrOptions")
		.data(attrArray)
		.enter()
		.append("option")
		.attr("value", function(d){ return d })
		.text(function(d){ return d });
};  // end createDropDown

//dropdown change listener handler
function changeAttribute(attribute, csvData){
	//change the expressed attribute
  console.log('hola!!');
	expressed = attribute;

  // var expressed = attrArray[0];
	//recreate the color scale

	var colorScale = makeColorScale(csvData);

	//recolor enumeration units
	var countries = d3.selectAll(".countries")
		.transition()
		.duration(1000)
		.style("fill", function(d){
			return choropleth(d.properties, colorScale)
		});

	//re-sort, resize, and recolor bars
	var bars = d3.selectAll(".bar")
		//re-sort bars
		.sort(function(a, b){
			return b[expressed] - a[expressed];
		})
		.transition() //add animation
		.delay(function(d, i){
			return i * 20
		})
		.duration(500);

	updateChart(bars, csvData.length, colorScale);
};  // changeAttribute


})();
