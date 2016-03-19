// load windows
window.onload = setMap();

// set up the choropleth map
function setMap () {
  // using queue.js
  var width = 960;
  var height = 500;

  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height)

    ;

  // alberts projection
  var projection = d3.geo.conicEqualArea()  //equirectangular()
    .center([-0.6, 38.7]) //long and lat in the center of the plane
    .rotate([90,20,0])  //long and lat
    .parallels([29.5, 45.5])  //the standard parallels; one array tangent; two secant
    .scale(200)  //scales * distance [bwn points]
    .translate([width/2, height/2]);

 var path = d3.geo.path()
    .projection(projection);

 queue()
    .defer(d3.csv, "data/Lab2.csv") //load attributes from csv
    .defer(d3.json, "data/WorldCountries.topojson") //load spatial data
            //.defer(d3.json, "data/FranceProvinces.topojson")
    .await(callback);

 function callback(error, csvData, world){
    var world = topojson.feature(world, world.objects.WorldCountries).features;
            //console.log(error);
            //console.log(csvData);
            //console.log(world);

    var graticule = d3.geo.graticule()
          .extent([[-98 - 45, 38 - 45], [-98 + 45, 38 + 45]])
          .step([5, 5]);


           //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
       .data(graticule.lines()) //bind graticule lines to each element to be created
       .enter() //create an element for each datum
       .append("path") //append each element to the svg as a path element
       .attr("class", "gratLines") //assign class for styling
       .attr("d", path); //project graticule lines


    var regions = map.selectAll(".regions")
           .data(world)
           .enter()
           .append("path")
           .attr("class", function(d){
               return "regions " + d.properties.adm0_a3;
           })
           .attr("d", path);

    };



};
