'use strict';

app.directive('weatherVisualization', ['d3Service', '$timeout', function (d3Service, $timeout) {

    return {
        restrict: 'EA',
        scope: {
            val: '=',
            onClick: '&'  // parent execution binding
        },
        link: function (scope, element, attrs) {
            console.log(attrs.monthview);

            d3Service.d3().then(function(d3) {

                // constants
                var margin = {top: 20, right: 50, bottom: 40, left: 50},
                    width = 900 - margin.left - margin.right,
                    height = attrs.height - margin.top - margin.bottom,
                    barWidth = 10;

                // set up initial svg object
                var svg = d3.select(element[0])
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                scope.$watch('val', function(newData) {
                    scope.render(newData);
                }, true);

                scope.render = function(data) {
                    // clear the elements inside of the directive
                    svg.selectAll('*').remove();

                    // if 'data' is undefined, exit
                    if (!data) {
                        return;
                    }
                    console.log("Rendering");
                    //console.log(data);

                    // Use the category20() scale function for multicolor support
                    var color = d3.interpolateRgb("orange", "#FF641C");
                    // our yScale0
                    var yScale0 = d3.scaleLinear()
                        .range([height, 0]);
                    if (attrs.monthview) {
                        yScale0
                            .domain([0, d3.max(data, function (d) {
                                return d.value.temperature;
                            })]);
                    } else {
                        margin.top = 0;
                        yScale0
                            .domain([0, 20]);
                    }
                    var yScale1 = d3.scaleLinear()
                        .range([height, 0])
                        .domain([0, d3.max(data, function (d) {
                            return Math.max(d.value.rainfall);
                        })])

                    var xScale = d3.scaleBand()
                        .domain(data.map(function(d) { return formatDate(d.key); }))
                        .rangeRound([0, width])
                        .padding([0.05]);

                    // define the line
                    var valueline = d3.line()
                        .x(function(d) { return xScale(formatDate(d.key)); })
                        .y(function(d) { return yScale1(d.value.rainfall); });

                    barWidth = width/data.length;

                    var bar = svg.selectAll("g")
                        .data(data)
                        .enter().append("g")
                        .attr("transform", function(d) { return "translate(" + xScale(formatDate(d.key)) + ",0)"; });

                    if (attrs.monthview) {
                        //create the rectangles for the bar chart
                        bar.append('rect')
                            .classed("monthBar", true)
                            .attr("y", function (d) {
                                return yScale0(d.value.temperature);
                            })
                            .attr("height", function (d) {
                                return height - yScale0(Math.abs(d.value.temperature));
                            })
                            .attr("width", xScale.bandwidth())
                            .on('click', function (d, i) {
                                d3.selectAll('.monthBar').style("fill", "orange");
                                console.log(d);
                                if (this.classList.contains("monthBar")) {
                                        d3.select(this).style("fill", color(1));
                                }
                                return scope.onClick({item: d});
                            });
                    } else {
                        bar.append('rect')
                            .classed("bar", true)
                            .attr("y", function (d) {
                                return height;
                            })
                            .attr("height", function (d) {
                                return 0;
                            })
                            .attr("width", xScale.bandwidth())
                            .on('click', function (d, i) {
                                d3.selectAll('.bar').style("fill", "orange");
                                if (this.classList.contains("bar")) {
                                    d3.select(this).style("fill", color(2));
                                }
                                return scope.onClick({item: d});
                            })
                            .transition()
                             .duration(750)
                             .attr('height', function(d) {
                             return height - yScale0(Math.abs(d.value.temperature));
                             })
                            .attr("y", function (d) {
                                return yScale0(d.value.temperature);
                            });
                    }

                    bar.append("text")
                        .classed("marker", true)
                        .attr("x", xScale.bandwidth() / 2)
                        .attr("y", function(d) { return yScale0(d.value.temperature) + 5; })
                        .attr("dy", ".75em")
                        .text(function(d) { return parseInt(d.value.temperature, 10); });

                    // Add the x Axis
                    svg.append("g")
                        .attr("class", "xAxis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(xScale));

                    // text label for the x axis
                    svg.append("text")
                        .classed("label", true)
                        .attr("transform",
                            "translate(" + (width/2) + " ," +
                            (height + margin.bottom) + ")")
                        .style("text-anchor", "middle")
                        .text("Date");

                    // Add the y Axis
                    svg.append("g")
                        .attr("class", "yAxis")
                        .call(d3.axisLeft(yScale0));

                    svg.append("g")
                        .attr("class", "yAxis1")
                        .attr("transform", "translate(" + width + ", 0)")
                        .call(d3.axisRight(yScale1));

                    // text label for the y axis
                    svg.append("text")
                        .classed("label", true)
                        .attr("transform", "rotate(-90)")
                        .attr("y", 0 - margin.left + 5)
                        .attr("x",0 - (height / 2))
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Temperature °C");

                    svg.append("text")
                        .classed("label", true)
                        .attr("transform", "rotate(90)")
                        .attr("y", - width - margin.right)
                        .attr("x", 0 + (height / 2))
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text("Precipitation mm");

                    svg.append("path")        // Add the valueline path.
                        .attr("class", "line")
                        .attr("d", valueline(data));

                    if (attrs.monthview) {
                        $timeout(function() {
                            scope.$digest();
                            d3.selectAll(".monthBar").each(function(d, i) {
                                if (i==0) {
                                    var onClickFunc = d3.select(this).on("click");
                                    onClickFunc.apply(this, [d, i]);
                                }
                            })
                        }, 500);
                    }
                }
            });

            function formatDate(dateTime) {
                var year = dateTime.substr(0, 4);
                var month = dateTime.substr(5, 7);
                var day = dateTime.substr(8, 10) || "01";

                var date = new Date(month + "/" + day + "/" + year),
                locale = "en-us";
                if (dateTime.length < 10) {
                    return date.toLocaleString(locale, {month: "short"});
                } else {
                    return parseInt(day);
                }
            }


        }
    }
}]);