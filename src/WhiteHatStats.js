import React, {useEffect, useRef,useMemo} from 'react';
import useSVGCanvas from './useSVGCanvas.js';
import * as d3 from 'd3';

//change the code below to modify the bottom plot view
export default function WhiteHatStats(props){
    //this is a generic component for plotting a d3 plot
    const d3Container = useRef(null);
    //this automatically constructs an svg canvas the size of the parent container (height and width)
    //tTip automatically attaches a div of the class 'tooltip' if it doesn't already exist
    //this will automatically resize when the window changes so passing svg to a useeffect will re-trigger
    const [svg, height, width, tTip] = useSVGCanvas(d3Container);

    const margin = 50;
    const radius = 10;


    //Gender-based analysis of gun death data
    //this loop updates when the props.data changes or the window resizes
    //also responds to brushedState for linked interaction with the map
    useEffect(()=>{
        //wait until the data loads
        if(svg === undefined | props.data === undefined){ return }

        //aggregate gun deaths by state
        const data = props.data.states;
        
        //prepare data for gender analysis
        const plotData = [];
        const victims = props.data.victims;
        
        for(let state of data){
            // Filter victims for this state
            const stateVictims = victims.filter(v => v.state === state.abreviation);
            
            // Calculate age group counts
            const childrenCount = stateVictims.filter(v => v.ageGroup === 0.0).length;
            const teensCount = stateVictims.filter(v => v.ageGroup === 1.0).length;
            const youngAdultsCount = stateVictims.filter(v => v.ageGroup === 2.0).length;
            const adultsCount = stateVictims.filter(v => v.ageGroup === 3.0).length;
            
            let entry = {
                'state': state.state,
                'abreviation': state.abreviation,
                'maleCount': state.male_count,
                'femaleCount': state.count - state.male_count,
                'totalCount': state.count,
                'childrenCount': childrenCount,
                'teensCount': teensCount,
                'youngAdultsCount': youngAdultsCount,
                'adultsCount': adultsCount,
                'malePercentage': (state.male_count / state.count) * 100,
                'femalePercentage': ((state.count - state.male_count) / state.count) * 100,
            }
            plotData.push(entry);
        }

        // Calculate country totals for overview
        const countryTotals = {
            totalDeaths: plotData.reduce((sum, state) => sum + state.totalCount, 0),
            maleDeaths: plotData.reduce((sum, state) => sum + state.maleCount, 0),
            femaleDeaths: plotData.reduce((sum, state) => sum + state.femaleCount, 0),
            childrenDeaths: plotData.reduce((sum, state) => sum + state.childrenCount, 0),
            teensDeaths: plotData.reduce((sum, state) => sum + state.teensCount, 0),
            youngAdultsDeaths: plotData.reduce((sum, state) => sum + state.youngAdultsCount, 0),
            adultsDeaths: plotData.reduce((sum, state) => sum + state.adultsCount, 0),
        };

        // Filter data based on brushed state if applicable
        let filteredData = plotData;
        let cityData = [];
        let cityGroups = {};
        
        if (props.brushedState) {
            // Find the state abbreviation from the brushed state name
            const brushedStateName = props.brushedState.replace('_', ' ');
            const stateData = plotData.find(d => d.state === brushedStateName);
            const stateAbbreviation = stateData ? stateData.abreviation : null;
            
            if (stateAbbreviation) {
                // For state view, show cities within that state
                const stateVictims = victims.filter(v => v.state === stateAbbreviation);
                
                // Check if state has any victims
                if (stateVictims.length === 0) {
                    filteredData = [];
                } else {
                    // Group by city
                    cityGroups = {};
                    stateVictims.forEach(victim => {
                    if (!cityGroups[victim.city]) {
                        cityGroups[victim.city] = {
                            city: victim.city,
                            totalCount: 0,
                            maleCount: 0,
                            femaleCount: 0,
                            childrenCount: 0,
                            teensCount: 0,
                            youngAdultsCount: 0,
                            adultsCount: 0
                        };
                    }
                    
                    cityGroups[victim.city].totalCount++;
                    if (victim.gender === 'M') {
                        cityGroups[victim.city].maleCount++;
                    } else {
                        cityGroups[victim.city].femaleCount++;
                    }
                    
                    // Age groups
                    if (victim.ageGroup === 0.0) cityGroups[victim.city].childrenCount++;
                    else if (victim.ageGroup === 1.0) cityGroups[victim.city].teensCount++;
                    else if (victim.ageGroup === 2.0) cityGroups[victim.city].youngAdultsCount++;
                    else if (victim.ageGroup === 3.0) cityGroups[victim.city].adultsCount++;
                });
                
                // Calculate percentages for each city
                Object.values(cityGroups).forEach(city => {
                    city.malePercentage = city.totalCount > 0 ? (city.maleCount / city.totalCount) * 100 : 0;
                    city.femalePercentage = city.totalCount > 0 ? (city.femaleCount / city.totalCount) * 100 : 0;
                });
                
                cityData = Object.values(cityGroups)
                    .sort((a, b) => b.totalCount - a.totalCount) // Sort by count first
                    .slice(0, 20); // Take top 20 cities
                
                    // Sort again by city name for better visualization
                    cityData.sort((a, b) => a.city.localeCompare(b.city));
                    filteredData = cityData;
                }
            }
        } else {
            // For country view, show all states
            filteredData = plotData;
        }

        // Keep original data order (no sorting by count)

        //set up scales
        let xScale, yScale;
        
        if (filteredData.length > 0) {
            xScale = d3.scaleBand()
                .domain(props.brushedState ? filteredData.map(d => d.city) : filteredData.map(d => d.abreviation))
                .range([margin, width - margin])
                .padding(0.1);
            
            const maxCount = d3.max(filteredData, d => d.totalCount);
            yScale = d3.scaleLinear()
                .domain([0, maxCount || 1])
                .range([height - margin, margin]);
        } else {
            // Fallback scales when no data
            xScale = d3.scaleBand()
                .domain(['No Data'])
                .range([margin, width - margin])
                .padding(0.1);
            
            yScale = d3.scaleLinear()
                .domain([0, 1])
                .range([height - margin, margin]);
        }

        // Color scales for male/female
        const maleColor = '#542788'; // Purple for male
        const femaleColor = '#b35806'; // Orange for female

        // Clear previous elements
        svg.selectAll('*').remove();

        // Create stacked bars only if we have data
        if (filteredData.length > 0) {
            const barGroups = svg.selectAll('.bar-group')
                .data(filteredData)
                .enter().append('g')
                .attr('class', 'bar-group');

            // Male bars (bottom)
            barGroups.append('rect')
                .attr('class', 'bar male-bar')
                .attr('x', d => xScale(props.brushedState ? d.city : d.abreviation))
                .attr('y', d => yScale(d.maleCount))
                .attr('width', xScale.bandwidth())
                .attr('height', d => height - margin - yScale(d.maleCount))
                .attr('fill', maleColor)
                .on('mouseover', (e, d) => {
                    const malePct = d.malePercentage ? d.malePercentage.toFixed(1) : '0.0';
                    const femalePct = d.femalePercentage ? d.femalePercentage.toFixed(1) : '0.0';
                    let string = (props.brushedState ? d.city : d.state) + '</br>'
                        + 'Male Deaths: ' + d.maleCount + ' (' + malePct + '%)</br>'
                        + 'Female Deaths: ' + d.femaleCount + ' (' + femalePct + '%)</br>'
                        + 'Total Deaths: ' + d.totalCount;
                    props.ToolTip.moveTTipEvent(tTip, e);
                    tTip.html(string);
                })
                .on('mousemove', (e) => {
                    props.ToolTip.moveTTipEvent(tTip, e);
                })
                .on('mouseout', (e, d) => {
                props.ToolTip.hideTTip(tTip);
            });
           
            // Female bars (top)
            barGroups.append('rect')
                .attr('class', 'bar female-bar')
                .attr('x', d => xScale(props.brushedState ? d.city : d.abreviation))
                .attr('y', d => yScale(d.totalCount))
                .attr('width', xScale.bandwidth())
                .attr('height', d => yScale(d.maleCount) - yScale(d.totalCount))
                .attr('fill', femaleColor)
                .on('mouseover', (e, d) => {
                    const malePct = d.malePercentage ? d.malePercentage.toFixed(1) : '0.0';
                    const femalePct = d.femalePercentage ? d.femalePercentage.toFixed(1) : '0.0';
                    let string = (props.brushedState ? d.city : d.state) + '</br>'
                        + 'Male Deaths: ' + d.maleCount + ' (' + malePct + '%)</br>'
                        + 'Female Deaths: ' + d.femaleCount + ' (' + femalePct + '%)</br>'
                        + 'Total Deaths: ' + d.totalCount;
                    props.ToolTip.moveTTipEvent(tTip, e);
                    tTip.html(string);
                })
                .on('mousemove', (e) => {
                    props.ToolTip.moveTTipEvent(tTip, e);
                })
                .on('mouseout', (e, d) => {
                    props.ToolTip.hideTTip(tTip);
                });
        } else {
            // Show "No Data" message
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '16px')
                .attr('fill', '#666')
                .text('No data available for this state');
        }

        // Add title
        const labelSize = margin/2;
        let titleText;
        
        if (props.brushedState) {
            // Find the state data for the brushed state
            const brushedStateName = props.brushedState.replace('_', ' ');
            const stateData = plotData.find(d => d.state === brushedStateName);
            
            if (stateData && filteredData.length > 0) {
                const cityCount = filteredData.length;
                const totalCities = Object.keys(cityGroups).length;
                if (cityCount < totalCities) {
                    titleText = `Top ${cityCount} Cities in ${stateData.state} (of ${totalCities} total) | State Total - Men: ${stateData.maleCount}, Women: ${stateData.femaleCount}, Children: ${stateData.childrenCount}, Teens: ${stateData.teensCount}, Adults: ${stateData.adultsCount}`;
                } else {
                    titleText = `Cities in ${stateData.state} | Men: ${stateData.maleCount}, Women: ${stateData.femaleCount}, Children: ${stateData.childrenCount}, Teens: ${stateData.teensCount}, Adults: ${stateData.adultsCount}`;
                }
            } else if (stateData && filteredData.length === 0) {
                titleText = `No city data available for ${stateData.state} | State Total - Men: ${stateData.maleCount}, Women: ${stateData.femaleCount}, Children: ${stateData.childrenCount}, Teens: ${stateData.teensCount}, Adults: ${stateData.adultsCount}`;
            } else {
                // State exists in map but not in data
                titleText = `No gun death data available for ${brushedStateName}`;
            }
        } else {
            titleText = `Deaths in USA | Men: ${countryTotals.maleDeaths.toLocaleString()}, Women: ${countryTotals.femaleDeaths.toLocaleString()}, Children: ${countryTotals.childrenDeaths.toLocaleString()}, Teens: ${countryTotals.teensDeaths.toLocaleString()}, Adults: ${countryTotals.adultsDeaths.toLocaleString()}`;
        }
        
        svg.append('text')
            .attr('x', width/2)
            .attr('y', labelSize)
            .attr('text-anchor', 'middle')
            .attr('font-size', labelSize)
            .attr('font-weight', 'bold')
            .text(titleText);

        // Add legend
        const legendY = margin + 20;
        svg.append('rect')
            .attr('x', width - 120)
            .attr('y', legendY)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', maleColor);
        
        svg.append('text')
            .attr('x', width - 100)
            .attr('y', legendY + 12)
            .attr('font-size', 12)
            .text('Male');

        svg.append('rect')
            .attr('x', width - 120)
            .attr('y', legendY + 25)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', femaleColor);
        
        svg.append('text')
            .attr('x', width - 100)
            .attr('y', legendY + 37)
            .attr('font-size', 12)
            .text('Female');

        // Add axes only if we have data
        if (filteredData.length > 0) {
        svg.append('g')
                .attr('class', 'axis')
                .attr('transform', `translate(0,${height-margin})`)
            .call(d3.axisBottom(xScale))
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-45)');

        svg.append('g')
                .attr('class', 'axis')
                .attr('transform', `translate(${margin},0)`)
                .call(d3.axisLeft(yScale));
        }
        
    },[svg,props.data,props.brushedState]);

    return (
        <div
            className={"d3-component"}
            style={{'height':'99%','width':'99%'}}
            ref={d3Container}
        ></div>
    );
}
//Gender-based analysis implementation completed
