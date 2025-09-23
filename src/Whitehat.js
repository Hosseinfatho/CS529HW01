import React, {useRef,useMemo} from 'react';
import useSVGCanvas from './useSVGCanvas.js';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

export default function Whitehat(props){
    //this is a generic component for plotting a d3 plot
    const d3Container = useRef(null);
    //this automatically constructs an svg canvas the size of the parent container (height and width)
    //tTip automatically attaches a div of the class 'tooltip' if it doesn't already exist
    //this will automatically resize when the window changes so passing svg to a useeffect will re-trigger
    const [svg, height, width, tTip] = useSVGCanvas(d3Container);
    var isZoomed = false;

    //TODO: change the line below to change the size of the white-hat maximum bubble size
    const maxRadius = width/100;

    //albers usa projection puts alaska in the corner
    //this automatically convert latitude and longitude to coordinates on the svg canvas
    const projection = d3.geoAlbersUsa()
        .scale(750)  // کاهش بیشتر scale برای نمایش کامل بخش بالا
        .translate([width/2, height/2]);

    //set up the path generator to draw the states
    const geoGenerator = d3.geoPath().projection(projection);

    //we need to use this function to convert state names into ids so we can select individual states by name using javascript selectors
    //since spaces makes it not work correctly
    function cleanString(string){
        return string.replace(' ','_').replace(' ','_')
    }


    //This is the main loop that renders the code once the data loads
    //TODO: edit or replace this code to create your white-hat version of the map view; for example, change the color map based on colorbrewer2, 
    const mapGroupSelection = useMemo(()=>{
        //wait until the svg is rendered and data is loaded
        if(svg !== undefined && props.map !== undefined && props.data !== undefined){
            // console.log('Rendering map...', {svg, map: props.map, data: props.data, countyData: props.countyData, showCounties: props.showCounties});

            const stateData = props.data.states;

            // Check if we should show counties
            const showCounties = props.showCounties && props.countyData;
            let mapData = props.map;
            let features = mapData.features;
            
            // If showing counties, convert TopoJSON to GeoJSON
            if (showCounties) {
                features = topojson.feature(props.countyData, props.countyData.objects.counties).features;
            }

            //Calculate the gun death rate per 100,000 (or per million)
            const getEncodedFeature = d => {
                if (d.population && d.population > 0) {
                    // Calculate deaths per million population
                    return Math.round(((d.count * 1000000) / d.population) * 10) / 10;
                }
                return 0;
            }

            //this section of code sets up the colormap
            const stateCounts = Object.values(stateData).map(getEncodedFeature);

            //get color extends for the color legend
            let [stateMin,stateMax] = d3.extent(stateCounts);
            
            // If showing counties, use county death rates for the scale
            if (showCounties && props.data.counties) {
                const countyDeathRates = props.data.counties.map(county => {
                    return county.population > 0 ? 
                        (county.count * 1000000) / county.population : 0;
                }).filter(rate => rate > 0); // Only include counties with deaths
                
                if (countyDeathRates.length > 0) {
                    [stateMin, stateMax] = d3.extent(countyDeathRates);
                }
            }

            //color map scale, scales numbers to a smaller range to use with a d3 color scale
            //we're using 0.2-1 range so lighter blue represents fewer deaths, darker blue more deaths
            const stateScale = d3.scaleLinear()
                .domain([stateMin,stateMax])
                .range([0.2,1]);

            // Use a more appropriate color scheme for gun death data
            // Blues color scheme - darker blue indicates more deaths
            const colorMap = d3.interpolateBlues;

            //this set of functions extracts the features given the state name from the geojson
            function getCount(name){
                //map uses full name, dataset uses abreviations
                name = cleanString(name);
                let entry = stateData.filter(d=>d.state===name);
                if(entry === undefined | entry.length < 1){
                    return 0
                }
                return getEncodedFeature(entry[0]);
            }
            
            // Function to get raw count for tooltip display
            function getRawCount(name){
                name = cleanString(name);
                let entry = stateData.filter(d=>d.state===name);
                if(entry === undefined | entry.length < 1){
                    return 0
                }
                return entry[0].count;
            }
            function getStateVal(name){
                let count = getCount(name);
                let val = stateScale(count);
                return val
            }

            function getStateColor(d){
                return colorMap(getStateVal(d.properties.NAME))
            }

            // County coloring based on actual death data
            function getCountyColor(d) {
                if (!showCounties) return '#E0E0E0';
                
                // Find county data using geographical matching
                const countyData = findCountyData(d);
                
                if (!countyData) {
                    return '#f0f0f0'; // Very light gray for counties with no data
                }
                
                if (countyData.count === 0) {
                    return '#f8f8f8'; // Slightly darker gray for counties with data but no deaths
                }
                
                // Calculate deaths per million for this county
                const deathRate = countyData.population > 0 ? 
                    ((countyData.count * 1000000) / countyData.population) : 0;
                
                // Use the same scale as states but with county death rates
                const scaledValue = stateScale(deathRate);
                
                return colorMap(scaledValue);
            }

            // Enhanced county matching function using geographical coordinates
            function findCountyData(countyFeature) {
                const countyName = countyFeature.properties.name || 'Unknown';
                
                // First try exact name match (case-insensitive)
                let countyData = props.data.counties.find(county => 
                    county.county.toLowerCase() === countyName.toLowerCase()
                );
                
                if (countyData) return countyData;
                
                // If no exact match, try geographical matching using city data
                // Get county centroid coordinates
                const countyCentroid = d3.geoCentroid(countyFeature);
                const [countyLng, countyLat] = countyCentroid;
                
                // Find nearest city with gun death data
                let nearestCity = null;
                let minDistance = Infinity;
                
                props.data.cities.forEach(city => {
                    if (city.lat && city.lng) {
                        // Calculate distance using Haversine formula
                        const distance = calculateDistance(countyLat, countyLng, city.lat, city.lng);
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestCity = city;
                        }
                    }
                });
                
                // Only use geographical match if distance is reasonable (within ~100km)
                if (minDistance < 100 && nearestCity) {
                    // Create a synthetic county data object from city data
                    return {
                        county: countyName,
                        state: nearestCity.state,
                        count: nearestCity.count,
                        male_count: nearestCity.male_count,
                        population: nearestCity.population || 50000, // Estimate if not available
                        lat: nearestCity.lat,
                        lng: nearestCity.lng
                    };
                }
                
                // Fallback: try partial name matching
                const variations = [
                    countyName.toLowerCase().replace(' county', ''),
                    countyName.toLowerCase().replace(' parish', ''),
                    countyName.toLowerCase().replace(' borough', ''),
                    countyName.toLowerCase().replace(' city', '')
                ];
                
                for (const variation of variations) {
                    countyData = props.data.counties.find(county => 
                        county.county.toLowerCase() === variation
                    );
                    if (countyData) return countyData;
                }
                
                return null;
            }

            // Haversine formula to calculate distance between two points
            function calculateDistance(lat1, lng1, lat2, lng2) {
                const R = 6371; // Earth's radius in kilometers
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                         Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            }

            // Debug: Check county matching when showing counties (only in development)
            if (showCounties && process.env.NODE_ENV === 'development') {
                let matchedCount = 0;
                let geoMatchedCount = 0;
                let nameMatchedCount = 0;
                features.forEach(feature => {
                    const countyName = feature.properties.name || 'Unknown';
                    const countyData = findCountyData(feature);
                    if (countyData) {
                        matchedCount++;
                        // Check if it was a geographical match (synthetic data)
                        if (countyData.county === countyName && countyData.lat && countyData.lng) {
                            geoMatchedCount++;
                        } else if (countyData.county.toLowerCase() === countyName.toLowerCase()) {
                            nameMatchedCount++;
                        }
                    }
                });
                // console.log(`County matching: ${matchedCount}/${features.length} counties matched (${nameMatchedCount} name matches, ${geoMatchedCount} geographical matches)`);
            }

            //clear earlier drawings
            svg.selectAll('g').remove();

            //OPTIONAL: EDIT THIS TO CHANGE THE DETAILS OF HOW THE MAP IS DRAWN
            //draw borders from map and add tooltip
            let mapGroup = svg.append('g').attr('class','mapbox');
            
            // Choose class name based on what we're showing
            const pathClass = showCounties ? 'county' : 'state';
            
            mapGroup.selectAll('path').filter(`.${pathClass}`)
                .data(features).enter()
                .append('path').attr('class', pathClass)
                //ID is useful if you want to do brushing as it gives you a way to select the path
                .attr('id',d=> showCounties ? `county_${d.id}` : cleanString(d.properties.NAME))
                .attr('d',geoGenerator)
                .attr('fill', showCounties ? getCountyColor : getStateColor) // Color counties based on estimated data
                .attr('stroke','black')
                .attr('stroke-width', showCounties ? 0.05 : 0.1)
                .on('mouseover',(e,d)=>{
                    if (showCounties) {
                        // County tooltip with actual data
                        let countyName = d.properties.name || 'Unknown County';
                        const countyData = findCountyData(d);
                        
                        if (countyData) {
                            let deathCount = countyData.count;
                            let maleCount = countyData.male_count;
                            let femaleCount = deathCount - maleCount;
                            let population = countyData.population;
                            let deathRate = population > 0 ? 
                                Math.round(((deathCount * 1000000) / population) * 10) / 10 : 0;
                            let stateName = countyData.state;
                            
                            let text = countyData.county + ' County, ' + stateName + '</br>' + 
                                      'Gun Deaths: ' + deathCount + '</br>' +
                                      'Male: ' + maleCount + ', Female: ' + femaleCount + '</br>' +
                                      'Per Million: ' + deathRate + '</br>' +
                                      'Population: ' + population.toLocaleString();
                            
                            // Add note if this was a geographical match
                            if (countyData.lat && countyData.lng && countyData.county === countyName) {
                                text += '</br><em>(Nearest city data)</em>';
                            }
                            
                            tTip.html(text);
                        } else {
                            let text = countyName + ' County</br>' + 
                                      'No gun death data available';
                            tTip.html(text);
                        }
                    } else {
                        // State tooltip
                    let state = cleanString(d.properties.NAME);
                    //this updates the brushed state
                    if(props.brushedState !== state){
                        props.setBrushedState(state);
                    }
                    let sname = d.properties.NAME;
                        let rawCount = getRawCount(sname);
                        let perMillionRate = getCount(sname);
                    let text = sname + '</br>'
                            + 'Gun Deaths: ' + rawCount + '</br>'
                            + 'Per Million: ' + perMillionRate;
                    tTip.html(text);
                    }
                }).on('mousemove',(e)=>{
                    //see app.js for the helper function that makes this easier
                    props.ToolTip.moveTTipEvent(tTip,e);
                }).on('mouseout',(e,d)=>{
                    if (!showCounties) {
                    props.setBrushedState();
                    }
                    props.ToolTip.hideTTip(tTip);
                });

            // If showing counties, add state boundaries on top for clarity
            if (showCounties) {
                mapGroup.selectAll('path.state-boundary')
                    .data(props.map.features).enter()
                    .append('path').attr('class', 'state-boundary')
                    .attr('d', geoGenerator)
                    .attr('fill', 'none')
                    .attr('stroke', '#333')
                    .attr('stroke-width', 0.8)
                    .attr('pointer-events', 'none'); // Don't interfere with county interactions
            }


            //TODO: replace or edit the code below to change the city marker being used. Hint: think of the cityScale range (perhaps use area rather than radius). 
            //draw markers for each city
            const cityData = props.data.cities
            const cityMax = d3.max(cityData.map(d=>d.count));
            const cityScale = d3.scaleLinear()
                .domain([0,cityMax])
                .range([0,maxRadius]);

            mapGroup.selectAll('.city-group').remove();

            // Create gender-based circle markers with separate circles
            mapGroup.selectAll('.city-group')
                .data(cityData).enter()
                .append('g').attr('class','city-group')
                .attr('id',d=>d.key)
                .style('cursor', 'pointer')
                .attr('transform', d => {
                    const [x, y] = projection([d.lng, d.lat]);
                    return `translate(${x}, ${y})`;
                })
                .each(function(d) {
                    const totalRadius = cityScale(d.count);
                    const maleCount = d.male_count;
                    const femaleCount = d.count - maleCount;
                    const malePercentage = d.count > 0 ? (maleCount / d.count) : 0;
                    const femalePercentage = d.count > 0 ? (femaleCount / d.count) : 0;
                    
                    // Calculate male circle radius (diameter ratio = male ratio)
                    const maleRadius = totalRadius * Math.sqrt(malePercentage);
                    
                    // Add background circle for females (full size)
                    d3.select(this)
                        .append('circle')
                        .attr('r', totalRadius)
                        .attr('fill', '#f1a340') // Orange for female background
                        .attr('opacity', 0.7)
                        .attr('stroke', '#333')
                        .attr('stroke-width', 0.5);
                    
                    // Add male circle (smaller, positioned to one side)
                    d3.select(this)
                        .append('circle')
                        .attr('cx', -totalRadius * 0.3) // Position to the left side
                        .attr('cy', 0)
                        .attr('r', maleRadius)
                        .attr('fill', '#998ec3') // Purple for male
                        .attr('opacity', 0.8)
                        .attr('stroke', '#333')
                        .attr('stroke-width', 0.5);
                })
                .on('mouseover',(e,d)=>{
                    let cityName = d.city;
                    let stateName = d.state;
                    let count = d.count;
                    let maleCount = d.male_count;
                    let femaleCount = count - maleCount;
                    let malePercentage = count > 0 ? ((maleCount / count) * 100).toFixed(1) : '0.0';
                    let femalePercentage = count > 0 ? ((femaleCount / count) * 100).toFixed(1) : '0.0';
                    let text = cityName + ', ' + stateName + '</br>'
                        + 'Total Deaths: ' + count + '</br>'
                        + 'Male: ' + maleCount + ' (' + malePercentage + '%)' + '</br>'
                        + 'Female: ' + femaleCount + ' (' + femalePercentage + '%)';
                    tTip.html(text);
                    // Highlight the city marker
                    d3.select(e.target).selectAll('circle')
                        .attr('opacity', 1)
                        .attr('stroke-width', 2);
                }).on('mousemove',(e)=>{
                    props.ToolTip.moveTTipEvent(tTip,e);
                }).on('mouseout',(e,d)=>{
                    props.ToolTip.hideTTip(tTip);
                    // Reset city marker appearance
                    const group = d3.select(e.target);
                    group.selectAll('circle').each(function(d, i) {
                        if (i === 0) {
                            // Female background circle
                            d3.select(this).attr('opacity', 0.7);
                        } else {
                            // Male circle
                            d3.select(this).attr('opacity', 0.8);
                        }
                    });
                    group.selectAll('circle')
                        .attr('stroke-width', 0.5);
                }).on('click',(e,d)=>{
                    // Toggle city selection
                    if(props.selectedCity === d.key) {
                        props.setSelectedCity(undefined);
                    } else {
                        props.setSelectedCity(d.key);
                    }
                });                

            
            //draw a color legend, automatically scaled based on data extents
            function drawLegend(){
                let bounds = mapGroup.node().getBBox();
                const barHeight = Math.min(height/10,40);
                
                let legendX = bounds.x + 10 + bounds.width;
                const barWidth = Math.min((width - legendX)/3,40);
                const fontHeight = Math.min(barWidth/2,12);
                let legendY = bounds.y + 2*fontHeight;
                
                let colorLData = [];
                //OPTIONAL: EDIT THE VALUES IN THE ARRAY TO CHANGE THE NUMBER OF ITEMS IN THE COLOR LEGEND
                for(let ratio of [0.1,.2,.3,.4,.5,.6,.7,.8,.9,.99]){
                    let val = (1-ratio)*stateMin + ratio*stateMax;
                    let scaledVal = stateScale(val);
                    let color = colorMap(scaledVal);
                    let entry = {
                        'x': legendX,
                        'y': legendY,
                        'value': val,
                        'color':color,
                    }
                    entry.text = Math.round(entry.value).toString();
            
                    colorLData.push(entry);
                    legendY += barHeight;
                }
    
                svg.selectAll('.legendRect').remove();
                svg.selectAll('.legendRect')
                    .data(colorLData).enter()
                    .append('rect').attr('class','legendRect')
                    .attr('x',d=>d.x)
                    .attr('y',d=>d.y)
                    .attr('fill',d=>d.color)
                    .attr('height',barHeight)
                    .attr('width',barWidth);
    
                svg.selectAll('.legendText').remove();
                const legendTitle = {
                    'x': legendX - barWidth,
                    'y': bounds.y,
                    'text': showCounties ? 'County Gun Deaths per Million' : 'Gun Deaths per Million' 
                }
                svg.selectAll('.legendText')
                    .data([legendTitle].concat(colorLData)).enter()
                    .append('text').attr('class','legendText')
                    .attr('x',d=>d.x+barWidth+5)
                    .attr('y',d=>d.y+barHeight/2 + fontHeight/4)
                    .attr('font-size',(d,i) => i == 0? 1.0*fontHeight:fontHeight)
                    .text(d=>d.text);
            }

            drawLegend();
            return mapGroup
        }
    },[svg, props.map, props.data, props.countyData, props.showCounties, width, height])

    //This adds zooming. Triggers whenever the function above finishes
    //this section can be included in the main body but is here as an example 
    //of how to do multiple hooks so updates don't have to occur in every state
    useMemo(()=>{
        if(mapGroupSelection === undefined){ return }
        
        //set up zooming
        function zoomed(event) {
            const {transform} = event;
            mapGroupSelection
                .attr("transform", transform)
               .attr("stroke-width", 1 / transform.k);
        }

        const zoom = d3.zoom()
            .on("zoom", zoomed);

        //OPTIONAL: EDIT THIS CODE TO CHANGE WHAT HAPPENS WHEN YOU CLICK A STATE
        //useful if you want to add brushing
        function clicked(event, d) {
            event.stopPropagation();
            if(isZoomed){
                mapGroupSelection.transition().duration(300).call(
                    zoom.transform,
                    d3.zoomIdentity.translate(0,0),
                    d3.pointer(event,svg.node())
                )
                    
            }
            else{
                //get bounds of path from map
                const [[x0, y0], [x1, y1]] = geoGenerator.bounds(d);
                //zoom to bounds
                mapGroupSelection.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                    d3.pointer(event, svg.node())
                );
            }
            //sets the zoomed state property in the main app when we click on something
            //if we are zoomed in, unzoom instead
            isZoomed = !isZoomed;
            if(isZoomed){
                props.setZoomedState(d.properties.NAME);
            } else{
                props.setZoomedState(undefined);
            }
        }
        

        mapGroupSelection.selectAll('.state')
            .attr('cursor','pointer')//so we know the states are clickable
            .on('click',clicked);

    },[mapGroupSelection]);

    //OPTIONAL: EDIT HERE TO CHANGE THE BRUSHING BEHAVIOUR IN THE MAP WHEN MOUSING OVER A STATE
    //WILL UPDATE WHEN THE "BRUSHEDSTATE" VARIABLE CHANGES
    //brush the state by altering it's opacity when the property changes
    //brushed state can be on the same level but that makes it harder to use in linked views
    //so its in the parent app to simplify the "whitehat" part which uses linked views.
    useMemo(()=>{
        if(mapGroupSelection !== undefined){
            const isBrushed = props.brushedState !== undefined;
            mapGroupSelection.selectAll('.state')
                .attr('opacity',isBrushed? .4:.8)
                .attr('strokeWidth',isBrushed? 1:2);
            if(isBrushed){
                mapGroupSelection.select('#'+props.brushedState)
                    .attr('opacity',1)
                    .attr('strokeWidth',3);
            }
        }
    },[mapGroupSelection,props.brushedState]);

    // Update city selection visual feedback
    useMemo(()=>{
        if(mapGroupSelection !== undefined){
            mapGroupSelection.selectAll('.city-group')
                .attr('opacity', d => {
                    if(props.selectedCity === undefined) return 1;
                    return props.selectedCity === d.key ? 1 : 0.3;
                })
                .selectAll('circle')
                .attr('stroke-width', d => {
                    if(props.selectedCity === undefined) return 0.5;
                    return props.selectedCity === d.key ? 3 : 0.5;
                })
                .attr('stroke', d => {
                    if(props.selectedCity === undefined) return '#333';
                    return props.selectedCity === d.key ? '#ff0000' : '#333';
                });
        }
    },[mapGroupSelection,props.selectedCity]);
    
    return (
        <div
            className={"d3-component"}
            style={{'height':'99%','width':'99%'}}
            ref={d3Container}
        ></div>
    );
}
