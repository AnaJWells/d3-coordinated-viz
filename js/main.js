// load windows
window.onload = setMap();

var chartWidth = window.innerWidth * 0.425,
  chartHeight = 473,
  leftPadding = 25,
  rightPadding = 2,
  topBottomPadding = 5,
  chartInnerWidth = chartWidth - leftPadding - rightPadding,
  chartInnerHeight = chartHeight - topBottomPadding * 2,
  translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

// set up the choropleth map
function setMap () {
  // using queue.js
  var width =  900  //window.innerWidth * 0.5,
  var height = 460;

  // map container
  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);

  var attrArray = ["PerAgLandArea", "PerArabLandArea","AvePrecip_mmperyr",
                   "PerAgEmploy", "PerForestLand", "PerRuralPop"];

  // alberts projection
  var projection = d3.geo.cylindricalEqualArea()
    //.center([0, 0]) //long and lat in the center of the plane
    .rotate([-10])  //long and lat -2,0
    //.parallels([29.5, 45.5])  //the standard parallels; one array tangent; two secant
    .scale(140)  //scales * distance [bwn points]
    .translate([width/2, height/2]);
    //.precision(0.1);

  var path = d3.geo.path()
    .projection(projection);

  queue()
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
      world = joinData(world, csvData, attrArray);
           //create the color scale
      var colorScale = makeColorScale(csvData, attrArray);
      //
      // add enumeration units to the map
      setEnumerationUnits(world, map, path, colorScale, attrArray);



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
function joinData(world, csvData, attrArray){

  for (var i =0; i < csvData.length; i++) {
     console.log('joinData');
     var csvCountry = csvData[i];
     var csvKey = csvCountry.CountryID;  //country ID

     // find the correspondent country for the csvKey
     for (var a=0; a<world.length; a++) {
       var worldProperties  = world[a].properties;
       var worldKeys = worldProperties.adm0_a3;

       if (csvKey == worldKeys) {
         //perform the join; assign csv attributes to geojson
         attrArray.forEach(function(attribute) {
           var val = parseFloat(csvCountry[attribute]);
           worldProperties[attribute] = val;
         });
       };
     }; //end of finding the key
  }; // end of loop for all csv Data
  return world;
};

//////////
function setEnumerationUnits(world, map, path, colorScale, attrArray){

  var expressed = attrArray[0];
  var countries = map.selectAll(".countries")
     .data(world)
     .enter()
     .append("path")
     .attr("class", function(d){
       return "countries " + d.properties.adm0_a3;
     })
     .attr("d", path)
     .style("fill", function(d) {
        return choropleth(d.properties, colorScale, expressed)
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

};

//function to test for data value and return color
function choropleth(props, colorScale, expressed){
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
function makeColorScale(data, attributes){
	var colorClasses = [
		"#D4B9DA",
		"#C994C7",
		"#DF65B0",
		"#DD1C77",
		"#980043"
	];

	//create color scale generator
	var colorScale = d3.scale.threshold()
		.range(colorClasses);

  var expressed = attributes[0];
	//array the values of the expressed attribute
	var domainArray = [];
	for (var i=0; i<data.length; i++){
    ///////////////////////////////
		var val = parseFloat(data[i][expressed]);
    //console.log('val in scaling', val);

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

	return colorScale;
};  // end color Scale generator
