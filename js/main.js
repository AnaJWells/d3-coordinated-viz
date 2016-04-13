//
(function(){

var attrArray = ["PerRuralPop", "PerAgLandArea", "PerArabLandArea",
                 "PerAgEmploy", "PerForestLand"];
var expressed = attrArray[0];

var allAttributes = ["Rural population (% of total pop)", "Agricultural land (% of land area)",
"Arable land (% of land area)",
"Employment in agriculture (% of tot. empl.)",
"Forest area (% of land area)"];

// Initialize the scale for the yAxis
var yScale = d3.scale.linear()
    .domain([0, 100])
    .range([463, 0])
    ;

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
  var height = 420;
  //var title = d3.select("title").append("p").text("Agricultural Indicators");
  // map container
  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);


  //var projection = d3.geo.homolosine()
  /*
  var projection = d3.geo.interrupt(d3.geo.homolosine.raw) //

  //.center([0, 0]) //long and lat in the center of the plane
    .lobes([[ // northern hemisphere
      [[-180,   0], [-100,  90], [ -40,   0]],
      [[ -40,   0], [  30,  90], [ 180,   0]]
    ], [ // southern hemisphere
      [[-180,   0], [-160, -90], [-100,   0]],
      [[-100,   0], [ -60, -90], [ -20,   0]],
      [[ -20,   0], [  20, -90], [  80,   0]],
      [[  80,   0], [ 140, -90], [ 180,   0]]
    ]])
  */
  //var projection = d3.geo.homolosine()
  var projection = d3.geo.eckert4()
    //.scale(175)
  //var projection = d3.geo.cylindricalEqualArea()
    .rotate([2,0])
    .scale(130)
    .translate([width/2, height/2])
    .precision(.1);

  var path = d3.geo.path()
    .projection(projection);


  d3_queue.queue()
    .defer(d3.csv, "data/AgData.csv") //load attributes from csv
    .defer(d3.json, "data/WorldCountries.topojson") //load contry spatial data
    .await(callback);

  function callback(error, csvData, world){
    if (error) {
      console.log(error); //send error to log
    }
    else {
      setGraticule(map, path);
      // convert to geojson format
      var world =topojson.feature(world, world.objects.WorldCountries).features;
           // join csv with spatial data

      world = joinData(world, csvData);
           //create the color scale
      var colorScale = makeColorScale(csvData);

      // add enumeration units to the map,
      // add chart and dropdown menu
      setEnumerationUnits(world, map, path, colorScale);
      setChart(csvData, colorScale);    //check for error NaN
      createDropDown(csvData);
    }
  };  // end callBack

};  // end setMap

//////////////////////////////
// define setGraticule function - graticule generator
function setGraticule(map, path) {
  var graticule = d3.geo.graticule()
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
     var csvKey = csvCountry.CountryID;  //country ID - key

     // find the correspondent country for the csvKey
     for (var a=0; a<world.length; a++) {
       // store the json props in a variable for ease
       var worldProperties  = world[a].properties; //props of json worldMap
       var worldKeys = worldProperties.adm0_a3;  // key of worldMap

       if (csvKey == worldKeys) {
         //perform the join; join csv attributes to geojson
         // for each one of the attributes in the csv file
         attrArray.forEach(function(attribute) {
           // change each string value to number; this changes null to NaN
           var val = parseFloat(csvCountry[attribute]);
           //  add only data with value
           //if (val && val != NaN){
             worldProperties[attribute] = val;
           //};

         });  //end of attrArray
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
        return choropleth(d.properties, colorScale)
     })
     // visual feedback
 		 .on("mouseover", function(d){
 			  highlight(d.properties);
 		 })
 		 .on("mouseout", function(d){
 		    dehighlight(d.properties);
 		 })
 		 .on("mousemove", moveLabel);

 	//add style descriptor to each path
   var desc = countries.append("desc")
 		 .text('{"stroke": "#FFF", "stroke-width": "0.75px"}');
};  // end setEnumeration units

//function to test for data value and return color
function choropleth(props, colorScale){
	//make sure attribute value is a number
	var val = parseFloat(props[expressed]);
	//if attribute value exists, assign a color; otherwise assign gray
	if (val && val != NaN){
    return colorScale(val);
	} else {
		return "#CCC";
	};
};  // end of choropleth


///////////////////////////////////
//function to create color scale generator
function makeColorScale(data){
	var colorClasses = [
     "#c6dbef",
     "#9ecae1",
     "#6baed6",
     "#3182bd",
     "#08519c"
	];

  //EQUAL INTERVAL COLOR SCALE GENERATOR
  var colorScale = d3.scale.quantile()
      .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
  var minmax = [
      d3.min(data, function(d) { return parseFloat(d[expressed]); }),
      d3.max(data, function(d) { return parseFloat(d[expressed]); })
  ];
    //assign two-value array as scale domain
  colorScale.domain(minmax);

  return colorScale;
};  // end color Scale generator - end makeColorScale
//// ----------------

//function to highlight enumeration units and bars
function highlight(props){
	//change stroke
  // only highlight contries with data
  var val = props[expressed];
  if (val && val != NaN){
	  var selected = d3.selectAll("." + props.adm0_a3)
	  	.style({
	  		"stroke": "yellow",
	  		"stroke-width": "2"
	  	});
	  setLabel(props);
  }

};  // end of highlight

//function to create dynamic label
function setLabel(props){
	//label content
  // contry props
  var allUnits = ["% Rural population",
  "% Agricultural land",
  "% Arable land",
  "% Employment in agriculture",
  "% Forest area"];

  var units = allUnits[attrArray.indexOf(expressed)];

	var labelAttribute = "<h2>" + props[expressed].toFixed(2) +
	units	+ "</h2>";

	//create info label div
	var infolabel = d3.select("body")
		.append("div")
		.attr({
			"class": "infolabel",
			"id": props.adm0_a3 + "_label"
		})
		.html(labelAttribute);

	var countryName = infolabel.append("div")
		.attr("class", "labelname")
		.html(props.name);

};  // end setLabel


//function to reset the element style on mouseout
function dehighlight(props){
	var selected = d3.selectAll("." + props.adm0_a3)
		.style({
			"stroke": function(){
				return getStyle(this, "stroke")
			},
			"stroke-width": function(){
				return getStyle(this, "stroke-width")
			}
      //"stroke": "#FFF",
			//"stroke-width": "0.75"
		});

	function getStyle(element, styleName){
		var styleText = d3.select(element)
			.select("desc")
			.text();

		var styleObject = JSON.parse(styleText);

		return styleObject[styleName];
	};

	//now remove the label
	d3.select(".infolabel")
		.remove();
};  //end dehighlight

//function to move info label with mouse
function moveLabel(){
	//label width
	var labelWidth = d3.select(".infolabel")
		.node()
		.getBoundingClientRect()  //careful!
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



////////////
//function to create coordinated bar chart
function setChart(csvData, colorScale){

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
	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b){   //sorts the classes bars
      //console.log (a[expressed], b[expressed]);
      // CHECK!! FOR NULL DATA
			return b[expressed]-a[expressed]
		})
		.attr("class", function(d){
			return "bar " + d.CountryID; //bars for countries
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
		.attr("x", 45)
		.attr("y", 25)
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
	updateChart(bars, csvData, colorScale);   //error NaN
};  // end setChart

//function to position, size, and color bars in chart
function updateChart(bars, csvData, colorScale){
	//position bars
  //// update axis scale
  /*var yScale = d3.scale.linear()
      .domain([0, d3.max(csvData, function(d) {
              return parseFloat(d[expressed]);
            })])
      .range([463, 0]);
  */

  //console.log (yScale (90));
  bars.attr("x", function(d, i){
			return i * (chartInnerWidth / csvData.length) + leftPadding;
		})
		//size/resize bars
		.attr("height", function(d, i){   //error NaN
         //var val = d[expressed];
         if (d[expressed] && d[expressed] != NaN){
              console.log('yes');
              return 463 - yScale(parseFloat(d[expressed]));
         }
         else {console.log("nonono")};
		})
		.attr("y", function(d, i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding;  ////
		})
		//color/recolor bars
		.style("fill", function(d){
			return choropleth(d, colorScale);
		});

   var theTitle = allAttributes[attrArray.indexOf(expressed)];
	//add the text-title to the chart title
	 var chartTitle = d3.select(".chartTitle")
		 .text(theTitle);  //.text (expressed);

/*

var yScale = d3.scale.linear()
    .domain([0, d3.max(csvData, function(d) {
            return parseFloat(d[expressed]);
          })])
    .range([463, 0]);


         //create vertical axis generator
   var yAxis = d3.svg.axis()
     .scale(yScale)
     .orient("left");

  //svg.selectAll("g.yScale.axis")
    // .call(yAxis);

*/


}; //end updateChart

//////////////////////
//////////////////////
//function to create a dropdown menu for attribute selection
function createDropDown(csvData){

	//add select element
	var dropdown = d3.select("body")
		.append("select")  //container for the menu
		.attr("class", "dropdown")
		.on("change", function(){
			changeAttribute(this.value, csvData)
		});

	//add initial option to the menu
	var titleOption = dropdown.append("option")
		.attr("class", "titleOption")
		.attr("disabled", "true")
		.text("Select Indicator");

	//add attribute name options to selection element
	var attrOptions = dropdown.selectAll("attrOptions")
		.data(attrArray)
		.enter()
		.append("option")
		.attr("value", function(d){  //name of attribute
      return d })
		.text(function(d, i){  //user view
      return allAttributes[i] });
      //return d });
};  // end createDropDown

//dropdown change listener handler
function changeAttribute(attribute, csvData){
	//change the expressed attribute
  // attribute is the attribute choosen by user
	expressed = attribute;

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

	updateChart(bars, csvData, colorScale);
};  // changeAttribute


})();
