# About This Visualization

## White-Hat Visualization Approach

This white-hat visualization provides a comprehensive and ethical analysis of gun death data in the United States. The visualization follows white-hat principles by presenting data in a clear, unbiased manner that promotes understanding rather than manipulation. Unlike black-hat visualizations that might distort or mislead, this implementation uses appropriate color schemes (blues for state-level data, purple/orange for gender breakdown), accurate scaling, and transparent data representation. The visualization includes detailed tooltips showing exact counts and percentages, interactive state brushing that reveals city-level breakdowns, and a stacked bar chart that provides gender-based analysis. All visual encodings are proportional and meaningful - circle sizes represent total death counts, gender ratios are accurately reflected in split circles, and the color mapping uses intuitive associations (purple for male, orange for female deaths).

## Implementation and Visual Encoding Updates

The visualization was enhanced through several key improvements to the original codebase. The main map visualization was updated to display gun deaths per million population using a blue color scheme, with state-level tooltips showing both raw counts and per-million rates. City markers were redesigned from simple red circles to gender-split visualizations using two overlapping circles - a background circle representing female deaths (orange) and a smaller circle positioned to one side representing male deaths (purple), with the male circle's diameter proportional to the male percentage of total deaths. The bottom statistics panel was completely refactored from a basic scatter plot to an interactive stacked bar chart showing gender breakdowns by state or city, with dynamic titles that update based on user selection. The visualization includes expandable instructions, proper attribution to data sources, and maintains full interactivity between map brushing and the statistics panel.

## Data Sources and Credits

**Primary Data Source:** Slate.com gun death database (https://www.slate.com/articles/news_and_politics/crime/2012/12/gun_death_tally_every_american_gun_death_since_newtown_sandy_hook_shooting.html)

**Geographic Data:** US States GeoJSON data for map rendering

**Visualization Framework:** D3.js (https://d3js.org/) for data visualization and React for component architecture

**Color Inspiration:** The purple (#998ec3) and orange (#f1a340) color scheme was inspired by ColorBrewer2 palettes, chosen for their accessibility and intuitive gender associations

**Code Structure:** Built upon the provided CS529 homework framework with significant enhancements to visual encoding, interactivity, and data representation

**Author:** Hossein Fathollahian - https://hosseinfatho.github.io/
