# About This Visualization

## White-Hat Visualization Approach

This white-hat visualization provides an ethical analysis of US gun death data, presenting information clearly without manipulation. The implementation uses appropriate color schemes (blues for state data, purple/orange for gender breakdown), accurate scaling, and transparent representation. Visual encodings are proportional and meaningful - circle sizes represent death counts, gender ratios are reflected in split circles, and tooltips show exact statistics.

## Implementation and Key Features

The visualization includes an interactive US map showing gun deaths per million population, gender-split city markers with overlapping circles (orange for female, purple for male deaths), and a dynamic stacked bar chart for state/city analysis. Recent enhancements added county-level visualization using geographical matching algorithms that combine name matching with Haversine distance calculations to map county boundaries to gun death data, creating synthetic data from nearest cities within 100km when exact matches aren't available.
## Data Sources and Credits

**Primary Data Source:** Slate.com gun death database (https://www.slate.com/articles/news_and_politics/crime/2012/12/gun_death_tally_every_american_gun_death_since_newtown_sandy_hook_shooting.html)

**Geographic Data:** US States GeoJSON data for map rendering
TopoJSON about US counties: https://github.com/topojson/us-atlas
List of states Abbreviations: https://github.com/jasonong/List-of-US-States/blob/master/states.csv
The US county population: https://www.census.gov/data/tables/time-series/demo/popest/2020s-counties-total.html
**Visualization Framework:** D3.js (https://d3js.org/) for data visualization and React for component architecture

**Color Inspiration:** The purple (#998ec3) and orange (#f1a340) color scheme was inspired by ColorBrewer2 palettes, chosen for their accessibility and intuitive gender associations

**Code Structure:** Built upon the provided CS529 homework framework with significant enhancements to visual encoding, interactivity, and data representation

**Author:** Hossein Fathollahian - https://hosseinfatho.github.io/
