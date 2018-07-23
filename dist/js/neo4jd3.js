(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
    var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, relationshipsCopy, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
        classes2colors = {},
        justLoaded = false,
        numClasses = 0,
        options = {
            arrowSize: 4,
            colors: colors(),
            highlight: undefined,
            iconMap: {},
            icons: undefined,
            imageMap: {},
            images: undefined,
            infoPanel: true,
            minCollision: undefined,
            neo4jData: undefined,
            neo4jDataUrl: undefined,
            nodeOutlineFillColor: undefined,
            nodeRadius: 25,
            relationshipColor: '#a5abb6',
            zoomFit: false
        },
        VERSION = '0.0.1';

    function appendGraph(container) {
        svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('class', 'neo4jd3-graph')
            .call(d3.zoom().on('zoom', function () {
                var scale = d3.event.transform.k,
                    translate = [d3.event.transform.x, d3.event.transform.y];

                if (svgTranslate) {
                    translate[0] += svgTranslate[0];
                    translate[1] += svgTranslate[1];
                }

                if (svgScale) {
                    scale *= svgScale;
                }

                svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
            }))
            .on('dblclick.zoom', null)
            .append('g')
            .attr('width', '100%')
            .attr('height', '100%');

        svgRelationships = svg.append('g')
            .attr('class', 'relationships');

        svgNodes = svg.append('g')
            .attr('class', 'nodes');
    }

    function appendInfoPanel(container) {
        return container.append('div')
            .attr('class', 'neo4jd3-info');
    }

    function appendInfoElement(cls, isNode, property, value) {
        var elem = info.append('a');

        elem.attr('href', '#')
            .attr('class', cls)
            .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));

        if (!value) {
            elem.style('background-color', function (d) {
                return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : (isNode ? class2color(property) : defaultColor());
            })
                .style('border-color', function (d) {
                    return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : (isNode ? class2darkenColor(property) : defaultDarkenColor());
                })
                .style('color', function (d) {
                    return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
                });
        }
    }

    function appendInfoElementClass(cls, node) {
        appendInfoElement(cls, true, node);
    }

    function appendInfoElementProperty(cls, property, value) {
        appendInfoElement(cls, false, property, value);
    }

    function appendInfoElementRelationship(cls, relationship) {
        appendInfoElement(cls, false, relationship);
    }

    function appendContextMenu(node, index) {
        // Create the container for the context menu
        d3.selectAll('.context-menu').data([1])
            .enter()
            .append('div')
            .attr('class', 'context-menu');

        // Hide the context-menu if it goes out of focus 
        d3.select('body').on('click.context-menu', function () {
            d3.select('.context-menu').style('display', 'none');
        });

        // Append data to the context menu
        d3.selectAll('.context-menu')
            .html('')
            .append('ul')
            .selectAll('li')
            .data(options.contextMenu)
            .enter()
            .append('li')
            .on('contextmenu', function (item) {
                d3.event.preventDefault();
            })
            .on('click', function (item) {
                item.handler(node);
                d3.select('.context-menu').style('display', 'none');
            })
            .append('i')
            .attr('class', function (d) {
                return d.icon;
            })
            .text(function (d) {
                return " " + d.text;
            });

        // Show the context menu
        d3.select('.context-menu')
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
            .style('display', 'block');
        d3.event.preventDefault();
    }

    function appendNode() {
        return node.enter()
            .append('g')
            .on('contextmenu', appendContextMenu)
            .attr('id', function (d) {
                d.uuid = guid();
                return d.uuid;
            })
            .attr('class', function (d) {
                var highlight, i,
                    classes = 'node',
                    label = d.labels[0];

                if (image(d)) {
                    classes += ' node-image';
                }
                return classes;
            })
            .on('click', function (d) {
                if (typeof options.onNodeClick === 'function') {
                    options.onNodeClick(d);
                }
            })
            .on('dblclick', function (d) {

                if (typeof options.onNodeDoubleClick === 'function') {
                    options.onNodeDoubleClick(d);
                }
            })
            .on('mouseenter', function (d) {
                if (info) {
                    updateInfo(d);
                }

                if (typeof options.onNodeMouseEnter === 'function') {
                    options.onNodeMouseEnter(d);
                }
            })
            .on('mouseleave', function (d) {

                if (typeof options.onNodeMouseLeave === 'function') {
                    options.onNodeMouseLeave(d);
                }
            })
            .call(d3.drag()
                .on('start', dragStarted)
                .on('drag', dragged)
                .on('end', dragEnded));
    }

    function appendNodeToGraph() {
        var n = appendNode();

        appendRingToNode(n);
        appendOutlineToNode(n);
        appendTextToNode(n);
        appendImageToNode(n);
        appendIconToNode(n);

        return n;
    }

    function appendIconToNode(node) {
        return node.append('text')
            .attr('class', 'text icon')
            .attr('fill', '#ffffff')
            .attr('font-size', '25px')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('y', parseInt(Math.round(options.nodeRadius * 0.32)) + 'px')
            .html(function (d) {
                var _icon = options.iconMap[d.labels[0].toLowerCase()];
                return _icon ? '&#x' + _icon : '';
            });
    }

    function appendImageToNode(node) {
        return node.append('image')
            .attr('height', '24px')
            .attr('x', '5px')
            .attr('y', '5px')
            .attr('width', '24px');
    }

    function appendOutlineToNode(node) {
        return node.append('circle')
            .attr('class', 'outline')
            .attr('r', options.nodeRadius)
            .style('fill', function (d) {
                return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
            })
            .style('stroke', function (d) {
                return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
            })
            .append('title').text(function (d) {
                return toString(d);
            });
    }

    function appendRingToNode(node) {
        return node.append('circle')
            .attr('class', 'ring')
            .attr('r', options.nodeRadius * 1.16)
            .append('title').text(function (d) {
                return toString(d);
            });
    }
    function truncateText(str, length) {

        var ending = '...';

        if (length == null) {
            length = 100;
        }

        if (str.length > length) {
            return str.substring(0, length - ending.length) + ending;
        } else {
            return str;
        }
    }

    function appendTextToNode(node) {
        var g = node.append('g');

        g.append('rect')
            .attr('width', '80px')
            .attr('height', '20px')
            .style('fill', '#bdc3c7')
            .attr('y', 28)
            .attr('x', -40)
            .attr('rx', 10)
            .attr('ry', 10);

        g.append('text')
            .text(function (node) {
                return node.properties.name ? truncateText(node.properties.name, 15) : node.id;
            })
            .attr('font-size', 10)
            .attr('x', 0)
            .attr('y', 37)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central');
    }


    function appendRelationship() {
        return relationship.enter()
            .append('g')
            .attr('id', function (d) {
                d.uuid = guid();
                return d.uuid;
            })
            .attr('class', 'relationship')
            .on('dblclick', function (d) {
                if (typeof options.onRelationshipDoubleClick === 'function') {
                    options.onRelationshipDoubleClick(d);
                }
            })
            .on('mouseenter', function (d) {
                if (info) {
                    updateInfo(d);
                }
            });
    }

    function appendOutlineToRelationship(r) {
        return r.append('path')
            .attr('class', 'outline')
            .attr('fill', '#a5abb6')
            .attr('stroke', 'none');
    }

    function appendOverlayToRelationship(r) {
        return r.append('path')
            .attr('class', 'overlay');
    }

    function appendTextToRelationship(r) {
        return r.append('text')
            .attr('class', 'text')
            .attr('fill', '#000000')
            .attr('font-size', '8px')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .text(function (d) {
                return d.type;
            });
    }

    function appendRelationshipToGraph() {
        var relationship = appendRelationship(),
            text = appendTextToRelationship(relationship),
            outline = appendOutlineToRelationship(relationship),
            overlay = appendOverlayToRelationship(relationship);

        return {
            outline: outline,
            overlay: overlay,
            relationship: relationship,
            text: text
        };
    }

    function class2color(cls) {
        var color = classes2colors[cls];

        if (!color) {
            //            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
            color = options.colors[numClasses % options.colors.length];
            classes2colors[cls] = color;
            numClasses++;
        }

        return color;
    }

    function class2darkenColor(cls) {
        return d3.rgb(class2color(cls)).darker(1);
    }

    function clearInfo() {
        info.html('');
    }

    function colors() {
        // d3.schemeCategory10,
        // d3.schemeCategory20,
        return [
            '#68bdf6', // light blue
            '#6dce9e', // green #1
            '#faafc2', // light pink
            '#f2baf6', // purple
            '#ff928c', // light red
            '#fcea7e', // light yellow
            '#ffc766', // light orange
            '#405f9e', // navy blue
            '#a5abb6', // dark gray
            '#78cecb', // green #2,
            '#b88cbb', // dark purple
            '#ced2d9', // light gray
            '#e84646', // dark red
            '#fa5f86', // dark pink
            '#ffab1a', // dark orange
            '#fcda19', // dark yellow
            '#797b80', // black
            '#c9d96f', // pistacchio
            '#47991f', // green #3
            '#70edee', // turquoise
            '#ff75ea'  // pink
        ];
    }

    function contains(array, id) {
        var filter = array.filter(function (elem) {
            return elem.id === id;
        });

        return filter.length > 0;
    }

    function defaultColor() {
        return options.relationshipColor;
    }

    function defaultDarkenColor() {
        return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
    }

    function dragEnded(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0);
        }

        if (typeof options.onNodeDragEnd === 'function') {
            options.onNodeDragEnd(d);
        }
    }

    function dragged(d) {
        stickNode(d);
    }

    function dragStarted(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0.3).restart();
        }

        d.fx = d.x;
        d.fy = d.y;

        if (typeof options.onNodeDragStart === 'function') {
            options.onNodeDragStart(d);
        }
    }

    function extend(obj1, obj2) {
        var obj = {};

        merge(obj, obj1);
        merge(obj, obj2);

        return obj;
    }

    function image(d) {
        var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

        if (options.images) {
            imagesForLabel = options.imageMap[d.labels[0]];

            if (imagesForLabel) {
                imgLevel = 0;

                for (i = 0; i < imagesForLabel.length; i++) {
                    labelPropertyValue = imagesForLabel[i].split('|');

                    switch (labelPropertyValue.length) {
                        case 3:
                            value = labelPropertyValue[2];
                        /* falls through */
                        case 2:
                            property = labelPropertyValue[1];
                        /* falls through */
                        case 1:
                            label = labelPropertyValue[0];
                    }

                    if (d.labels[0] === label &&
                        (!property || d.properties[property] !== undefined) &&
                        (!value || d.properties[property] === value)) {
                        if (labelPropertyValue.length > imgLevel) {
                            img = options.images[imagesForLabel[i]];
                            imgLevel = labelPropertyValue.length;
                        }
                    }
                }
            }
        }

        return img;
    }

    function init(_selector, _options) {

        merge(options, _options);

        if (options.icons) {
            options.showIcons = true;
        }

        if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
        }

        selector = _selector;

        container = d3.select(selector);

        container.attr('class', 'neo4jd3')
            .html('');

        if (options.infoPanel) {
            info = appendInfoPanel(container);
        }

        appendGraph(container);
        simulation = initSimulation();
        if (options.neo4jData) {
            loadNeo4jData(options.neo4jData);
        } else if (options.neo4jDataUrl) {
            loadNeo4jDataFromUrl(options.neo4jDataUrl);
        } else {
            console.error('Error: both neo4jData and neo4jDataUrl are empty!');
        }

        relationshipsCopy = relationships.map(function (a) {
            return Object.assign({}, a);
        });
    }

    function initSimulation() {
        var simulation = d3.forceSimulation()
            .force('collide', d3.forceCollide().radius(function (d) {
                return options.minCollision;
            }))
            .force('charge', d3.forceManyBody()
                .strength(-20)
                .distanceMax(150)
                .distanceMin(50))
            .force('link', d3.forceLink()
                .id(function (d) {
                    return d.id;
                })
                .distance(50)
            )
            .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2))
            .on('tick', function () {
                tick();
            })
            .on('end', function () {
                if (options.zoomFit && !justLoaded) {
                    justLoaded = true;
                    zoomFit(2);
                }
            });

        return simulation;
    }

    function loadNeo4jData() {
        nodes = [];
        relationships = [];

        updateWithNeo4jData(options.neo4jData);
    }

    function loadNeo4jDataFromUrl(neo4jDataUrl) {
        nodes = [];
        relationships = [];

        d3.json(neo4jDataUrl, function (error, data) {
            if (error) {
                throw error;
            }

            updateWithNeo4jData(data);
        });
    }

    function merge(target, source) {
        Object.keys(source).forEach(function (property) {
            target[property] = source[property];
        });
    }

    function neo4jDataToD3Data(data) {
        var graph = {
            nodes: [],
            relationships: []
        };

        data.results.forEach(function (result) {
            result.data.forEach(function (data) {
                data.graph.nodes.forEach(function (node) {
                    if (!contains(graph.nodes, node.id)) {
                        graph.nodes.push(node);
                    }
                });

                data.graph.relationships.forEach(function (relationship) {
                    if (!contains(graph.relationships, relationship.id)) {
                        relationship.source = relationship.startNode;
                        relationship.target = relationship.endNode;
                        graph.relationships.push(relationship);
                    }
                });

                data.graph.relationships.sort(function (a, b) {
                    if (a.source > b.source) {
                        return 1;
                    } else if (a.source < b.source) {
                        return -1;
                    } else {
                        if (a.target > b.target) {
                            return 1;
                        }

                        if (a.target < b.target) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                });

                for (var i = 0; i < data.graph.relationships.length; i++) {
                    if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i - 1].source && data.graph.relationships[i].target === data.graph.relationships[i - 1].target) {
                        data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
                    } else {
                        data.graph.relationships[i].linknum = 1;
                    }
                }
            });
        });

        return graph;
    }

    function appendDataToNode(sourceNode, newNodes, newRelationships) {
        var data = {
            nodes: [],
            relationships: []
        },
            node,
            relationship;

        for (var i = 0; i < newNodes.length; i++) {
            node = {
                id: newNodes[i].id,
                labels: newNodes[i].labels,
                properties: newNodes[i].properties,
                x: sourceNode.x,
                y: sourceNode.y
            };
            data.nodes[data.nodes.length] = node;
        }

        for (var j = 0; j < newRelationships.length; j++) {

            relationship = {
                id: newRelationships[j].id,
                type: newRelationships[j].type,
                startNode: newRelationships[j].startNode,
                endNode: newRelationships[j].endNode,
                properties: newRelationships[j].properties,
                source: newRelationships[j].source,
                target: newRelationships[j].endNode,
            };
            data.relationships[data.relationships.length] = relationship;
        }
        updateWithD3Data(data);

    }

    function rotate(cx, cy, x, y, angle) {
        var radians = (Math.PI / 180) * angle,
            cos = Math.cos(radians),
            sin = Math.sin(radians),
            nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
            ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;

        return { x: nx, y: ny };
    }

    function rotatePoint(c, p, angle) {
        return rotate(c.x, c.y, p.x, p.y, angle);
    }

    function rotation(source, target) {
        return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
    }

    function size() {
        return {
            nodes: nodes.length,
            relationships: relationships.length
        };
    }
    /*
        function smoothTransform(elem, translate, scale) {
            var animationMilliseconds = 5000,
                timeoutMilliseconds = 50,
                steps = parseInt(animationMilliseconds / timeoutMilliseconds);
    
            setTimeout(function() {
                smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
            }, timeoutMilliseconds);
        }
    
        function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
            var progress = step / steps;
    
            elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');
    
            if (step < steps) {
                setTimeout(function() {
                    smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
                }, timeoutMilliseconds);
            }
        }
    */
    function stickNode(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function tick() {
        tickNodes();
        tickRelationships();
    }

    function tickNodes() {
        if (node) {

            node.attr('transform', function (d) {
                return 'translate(' + d.x + ', ' + d.y + ')';
            });
        }
    }

    function tickRelationships() {
        if (relationship) {
            relationship.attr('transform', function (d) {
                var distanceBetweenNodes = Math.sqrt(Math.pow(d.source.x - d.target.x, 2) + Math.pow(d.source.y - d.target.y, 2));
                // Fix nodes if the distance is bigger than indicated length
                if (distanceBetweenNodes > 400) {
                    d.source.fx = d.source.x;
                    d.source.fy = d.source.y;
                    d.target.fx = d.target.x;
                    d.target.fy = d.target.y;
                }
                var angle = rotation(d.source, d.target);
                return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
            });

            tickRelationshipsTexts();
            tickRelationshipsOutlines();
            tickRelationshipsOverlays();
        }
    }

    function tickRelationshipsOutlines() {
        relationship.each(function () {
            var rel = d3.select(this),
                outline = rel.select('.outline'),
                text = rel.select('.text');

            outline.attr('d', function (d) {
                var center = { x: 0, y: 0 },
                    angle = rotation(d.source, d.target),
                    textBoundingBox = text.node().getBBox(),
                    textPadding = 5,
                    u = unitaryVector(d.source, d.target),
                    textMargin = { x: (d.target.x - d.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (d.target.y - d.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
                    n = unitaryNormalVector(d.source, d.target),
                    rotatedPointA1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x - n.x, y: 0 + (options.nodeRadius + 1) * u.y - n.y }, angle),
                    rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
                    rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
                    rotatedPointD1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x, y: 0 + (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointA2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x - n.x, y: d.target.y - d.source.y - textMargin.y - n.y }, angle),
                    rotatedPointB2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y - u.y * options.arrowSize }, angle),
                    rotatedPointC2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x + (n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y + (n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointD2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointE2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x + (- n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y + (- n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointF2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - u.y * options.arrowSize }, angle),
                    rotatedPointG2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x, y: d.target.y - d.source.y - textMargin.y }, angle);
                return 'M ' + rotatedPointA1.x + ' ' + rotatedPointA1.y +
                    ' L ' + rotatedPointB1.x + ' ' + rotatedPointB1.y +
                    ' L ' + rotatedPointC1.x + ' ' + rotatedPointC1.y +
                    ' L ' + rotatedPointD1.x + ' ' + rotatedPointD1.y +
                    ' Z M ' + rotatedPointA2.x + ' ' + rotatedPointA2.y +
                    ' L ' + rotatedPointB2.x + ' ' + rotatedPointB2.y +
                    ' L ' + rotatedPointC2.x + ' ' + rotatedPointC2.y +
                    ' L ' + rotatedPointD2.x + ' ' + rotatedPointD2.y +
                    ' L ' + rotatedPointE2.x + ' ' + rotatedPointE2.y +
                    ' L ' + rotatedPointF2.x + ' ' + rotatedPointF2.y +
                    ' L ' + rotatedPointG2.x + ' ' + rotatedPointG2.y +
                    ' Z';
            });
        });
    }

    function tickRelationshipsOverlays() {
        relationshipOverlay.attr('d', function (d) {
            var center = { x: 0, y: 0 },
                angle = rotation(d.source, d.target),
                n1 = unitaryNormalVector(d.source, d.target),
                n = unitaryNormalVector(d.source, d.target, 50),
                rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
                rotatedPointB = rotatePoint(center, { x: d.target.x - d.source.x - n.x, y: d.target.y - d.source.y - n.y }, angle),
                rotatedPointC = rotatePoint(center, { x: d.target.x - d.source.x + n.x - n1.x, y: d.target.y - d.source.y + n.y - n1.y }, angle),
                rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);

            return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y +
                ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y +
                ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y +
                ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y +
                ' Z';
        });
    }

    function tickRelationshipsTexts() {
        relationshipText.attr('transform', function (d) {
            var angle = (rotation(d.source, d.target) + 360) % 360,
                mirror = angle > 90 && angle < 270,
                center = { x: 0, y: 0 },
                n = unitaryNormalVector(d.source, d.target),
                nWeight = mirror ? 2 : -3,
                point = { x: (d.target.x - d.source.x) * 0.5 + n.x * nWeight, y: (d.target.y - d.source.y) * 0.5 + n.y * nWeight },
                rotatedPoint = rotatePoint(center, point, angle);

            return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
        });
    }

    function toString(d) {
        var s = d.labels ? d.labels[0] : d.type;

        s += ' (<id>: ' + d.id;

        Object.keys(d.properties).forEach(function (property) {
            s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
        });

        s += ')';

        return s;
    }

    function unitaryNormalVector(source, target, newLength) {
        var center = { x: 0, y: 0 },
            vector = unitaryVector(source, target, newLength);

        return rotatePoint(center, vector, 90);
    }

    function unitaryVector(source, target, newLength) {
        var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);

        return {
            x: (target.x - source.x) / length,
            y: (target.y - source.y) / length,
        };
    }

    function updateWithD3Data(d3Data) {
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships, true);
    }

    function updateWithNeo4jData(neo4jData) {
        var d3Data = neo4jDataToD3Data(neo4jData);
        updateWithD3Data(d3Data);
    }

    function updateInfo(d) {
        clearInfo();

        if (d.labels) {
            appendInfoElementClass('class', d.labels[0]);
        } else {
            appendInfoElementRelationship('class', d.type);
        }

        appendInfoElementProperty('property', '&lt;id&gt;', d.id);

        Object.keys(d.properties).forEach(function (property) {
            appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
        });
    }

    function updateNodes(n, append) {
        if (append) {
            Array.prototype.push.apply(nodes, n);
        }

        node = svgNodes.selectAll('.node')
            .data(nodes, function (d) { return d.id; });
        var nodeEnter = appendNodeToGraph();
        node = nodeEnter.merge(node);
    }

    function updateNodesAndRelationships(n, r, append) {
        updateRelationships(r, append);
        updateNodes(n, append);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateRelationships(r, append) {
        if (append) {
            Array.prototype.push.apply(relationships, r);
        }

        relationship = svgRelationships.selectAll('.relationship')
            .data(relationships, function (d) { return d.id; });

        var relationshipEnter = appendRelationshipToGraph();

        relationship = relationshipEnter.relationship.merge(relationship);

        relationshipOutline = svg.selectAll('.relationship .outline');
        relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);

        relationshipOverlay = svg.selectAll('.relationship .overlay');
        relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);

        relationshipText = svg.selectAll('.relationship .text');
        relationshipText = relationshipEnter.text.merge(relationshipText);
    }

    function version() {
        return VERSION;
    }

    function zoomFit(transitionDuration) {
        var bounds = svg.node().getBBox(),
            parent = svg.node().parentElement.parentElement,
            fullWidth = parent.clientWidth,
            fullHeight = parent.clientHeight,
            width = bounds.width,
            height = bounds.height,
            midX = bounds.x + width / 2,
            midY = bounds.y + height / 2;

        if (width === 0 || height === 0) {
            return; // nothing to fit
        }

        svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
        svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];

        svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
        //        smoothTransform(svgTranslate, svgScale);
    }

    function resetWithNeo4jData(neo4jData) {
        var newOptions = Object.assign(_options, { neo4jData: neo4jData, neo4jDataUrl: undefined });
        init(_selector, newOptions);
    }

    function removeNode(sourceNode) {
        relationships = relationships.filter(function (relationship) {
            if (relationship.source === sourceNode || relationship.target === sourceNode) {
                d3.select("#" + relationship.uuid).remove();
                return false;
            } else {
                return true;
            }
        });
        nodes = nodes.filter(function (node) {
            return node !== sourceNode;
        });

        d3.select("#" + sourceNode.uuid).remove();
        updateNodesAndRelationships(nodes, relationships, false);
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return 'g' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    init(_selector, _options);

    function createViews(keys) {
        d3.selectAll(".views").remove();
        var circles = d3.select('svg').selectAll('rect.views').data(keys);
        var r = 20;
        circles.enter().append('rect').classed('views', true)
            .attr('x', r)
            .attr('y', function (node) {
                return (keys.indexOf(node) + 1) * 2.2 * r + 27;
            })
            .attr('rx', r / 3)
            .attr('rx', r / 3)
            .attr('width', r * 4)
            .attr('height', r)
            .attr('fill', function (node) {
                return colors()[keys.indexOf(node) + 1];
            })
            .attr('stroke', function (node) {
                return "#000000";
            })
            .attr('stroke-width', function (node) {
                return "0.5px";
            })
            .attr("cursor", "pointer")
            .on('click', function (n) {
                if (typeof options.onViewsClickHandler === 'function') {
                    options.onViewsClickHandler(n);
                }
            })
            .on('mouseover', function (n) {
                if (typeof options.onViewsMouseOverHandler === 'function') {
                    options.onViewsMouseOverHandler(n);
                }
            }).on('mouseleave', function (n) {
                if (typeof options.onViewsMouseLeaveHandler === 'function') {
                    options.onViewsMouseLeaveHandler(n);
                }
            });

        var text = d3.select('svg').selectAll('text.views').data(keys);
        text.enter().append('text').classed('views', true)
            .attr('text-anchor', 'left')
            .attr('font-weight', 'bold')
            .attr('stroke-width', '0')
            .attr('stroke-color', 'white')
            .attr('fill', '#696969')
            .attr('x', 2 * r)
            .attr('font-size', "10px")
            .attr("cursor", "pointer")
            .text(function (node) {
                return node;
            }).attr('y', function (node) {
                return (keys.indexOf(node) + 1) * 2.2 * r + 40;
            })
            .on('click', function (n) {
                if (typeof options.onViewsClickHandler === 'function') {
                    options.onViewsClickHandler(n);
                }
            })
            .on('mouseover', function (n) {
                if (typeof options.onViewsMouseOverHandler === 'function') {
                    options.onViewsMouseOverHandler(n);
                }
            })
            .on('mouseleave', function (n) {
                if (typeof options.onViewsMouseLeaveHandler === 'function') {
                    options.onViewsMouseLeaveHandler(n);
                }
            });
        return circles.exit().remove();
    }

    function highlightNodes(nodes) {
        nodes.forEach(function (node) {
            d3.select("#" + node.uuid)
                .classed('node-highlighted', true);
        });
    }

    function unHighlightNodes(nodes) {
        nodes.forEach(function (node) {
            d3.select("#" + node.uuid)
                .classed('node-highlighted', false);
        });
    }

    function orientForceGraphVertical(priorities) {
        nodes.sort(function (a, b) {
            return priorities[a.labels[0].toLowerCase()] - priorities[b.labels[0].toLowerCase()];
        });

        var priority = 0;
        var x = 700;
        var y = 200;

        nodes.forEach(function (node) {
            if (priorities[node.labels[0].toLowerCase()] !== priority) {
                priority = priorities[node.labels[0].toLowerCase()];
                y += 130;
                x = 700;
            }
            x += 150;

            node.fx = x;
            node.fy = y;
        });
    }

    function orientForceGraphHorizontal(priorities) {
        nodes.sort(function (a, b) {
            return priorities[a.labels[0].toLowerCase()] - priorities[b.labels[0].toLowerCase()];
        });

        var priority = 0;
        var x = 700;
        var y = 200;

        nodes.forEach(function (node) {
            if (priorities[node.labels[0].toLowerCase()] !== priority) {
                priority = priorities[node.labels[0].toLowerCase()];
                y = 200;
                x += 150;
            }
            y += 150;
            node.fx = x;
            node.fy = y;
        });
    }

    function getGraph() {
        return { 'nodes': nodes, 'relationships': relationships };
    }


    function expandNode(currentNode) {

        var data = {
            nodes: [],
            relationships: []
        };

        var s = size();

        currentNode.previous.forEach(function (n, i) {
            // Create new node

            var rand = + Math.floor((Math.random() * 200) - 75);
            var node = {
                id: n.node.id,
                labels: n.node.labels,
                properties: n.node.properties,
                x: currentNode.x + rand,
                y: currentNode.y + rand,
                fx: currentNode.fx + rand,
                fy: currentNode.fy + rand,
            };
            data.nodes[data.nodes.length] = node;

            // Create link from new node to its parent
            data.relationships[data.relationships.length] = {
                id: n.link.id,
                type: n.link.type,
                properties: n.link.properties,
                startNode: node.id,
                endNode: currentNode.id,
                source: node.id,
                target: currentNode.id,
                linknum: s.relationships + 1 + i
            };

            // Find original links 

            var links = relationshipsCopy.filter(function (link) {
                return link.source.id === node.id || link.target.id === node.id;
            });

            // Get links of the parent node
            var parentLinks = relationships.filter(function (link) {
                return link.source === currentNode || link.target === currentNode;
            });

            // Update the links to the newly created node
            links.forEach(function (link) {
                var parentLink = parentLinks.find(function (p) {
                    return p.id === link.id;
                });

                if (parentLink) {
                    if (link.source.id === node.id) {
                        parentLink.source = node;
                    } else {
                        parentLink.target = node;
                    }
                }
            });
        });

        currentNode.collapsed = false;
        currentNode.previous = [];

        updateWithD3Data(data);
    }

    function collapseNode(node, rules) {
        if (!rules[node.labels[0].toLowerCase()]) {
            return;
        }

        var links = relationships.filter(function (link) {
            return link.source === node || link.target === node;
        });

        var parentLink = links.find(function (link) {
            return rules.link.includes(link.type.toLowerCase()) && link.target.labels[0].toLowerCase() === rules[node.labels[0].toLowerCase()];
        });

        if (!parentLink) {
            return;
        }

        parentLink.target.collapsed = true;

        links.splice(links.indexOf(parentLink), 1);

        if (!parentLink.target.previous) {
            parentLink.target.previous = [];
        }

        parentLink.target.previous.push({
            node: node,
            link: parentLink
        });

        links.forEach(function (link) {
            link.collapsed = true;
            if (link.source === node) {
                link.source = parentLink.target;
                link.startNode = parentLink.target.id;
            } else {
                link.target = parentLink.target;
                link.endNode = parentLink.target.id;
            }
        });

        removeNode(node);
    }

    return {
        neo4jDataToD3Data: neo4jDataToD3Data,
        size: size,
        updateWithD3Data: updateWithD3Data,
        updateWithNeo4jData: updateWithNeo4jData,
        appendDataToNode: appendDataToNode,
        resetWithNeo4jData: resetWithNeo4jData,
        removeNode: removeNode,
        createViews: createViews,
        highlightNodes: highlightNodes,
        unHighlightNodes: unHighlightNodes,
        orientForceGraphVertical: orientForceGraphVertical,
        orientForceGraphHorizontal: orientForceGraphHorizontal,
        getGraph: getGraph,
        collapseNode: collapseNode,
        expandNode: expandNode,
        version: version
    };
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBuZW80amQzID0gcmVxdWlyZSgnLi9zY3JpcHRzL25lbzRqZDMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZW80amQzO1xuIiwiLyogZ2xvYmFsIGQzLCBkb2N1bWVudCAqL1xyXG4vKiBqc2hpbnQgbGF0ZWRlZjpub2Z1bmMgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gTmVvNGpEMyhfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICB2YXIgY29udGFpbmVyLCBncmFwaCwgaW5mbywgbm9kZSwgbm9kZXMsIHJlbGF0aW9uc2hpcCwgcmVsYXRpb25zaGlwT3V0bGluZSwgcmVsYXRpb25zaGlwT3ZlcmxheSwgcmVsYXRpb25zaGlwVGV4dCwgcmVsYXRpb25zaGlwcywgcmVsYXRpb25zaGlwc0NvcHksIHNlbGVjdG9yLCBzaW11bGF0aW9uLCBzdmcsIHN2Z05vZGVzLCBzdmdSZWxhdGlvbnNoaXBzLCBzdmdTY2FsZSwgc3ZnVHJhbnNsYXRlLFxyXG4gICAgICAgIGNsYXNzZXMyY29sb3JzID0ge30sXHJcbiAgICAgICAganVzdExvYWRlZCA9IGZhbHNlLFxyXG4gICAgICAgIG51bUNsYXNzZXMgPSAwLFxyXG4gICAgICAgIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIGFycm93U2l6ZTogNCxcclxuICAgICAgICAgICAgY29sb3JzOiBjb2xvcnMoKSxcclxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGljb25NYXA6IHt9LFxyXG4gICAgICAgICAgICBpY29uczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbWFnZU1hcDoge30sXHJcbiAgICAgICAgICAgIGltYWdlczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbmZvUGFuZWw6IHRydWUsXHJcbiAgICAgICAgICAgIG1pbkNvbGxpc2lvbjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBuZW80akRhdGE6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVPdXRsaW5lRmlsbENvbG9yOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVSYWRpdXM6IDI1LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBDb2xvcjogJyNhNWFiYjYnLFxyXG4gICAgICAgICAgICB6b29tRml0OiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgVkVSU0lPTiA9ICcwLjAuMSc7XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kR3JhcGgoY29udGFpbmVyKSB7XHJcbiAgICAgICAgc3ZnID0gY29udGFpbmVyLmFwcGVuZCgnc3ZnJylcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnbmVvNGpkMy1ncmFwaCcpXHJcbiAgICAgICAgICAgIC5jYWxsKGQzLnpvb20oKS5vbignem9vbScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IGQzLmV2ZW50LnRyYW5zZm9ybS5rLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9IFtkMy5ldmVudC50cmFuc2Zvcm0ueCwgZDMuZXZlbnQudHJhbnNmb3JtLnldO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdmdUcmFuc2xhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGVbMF0gKz0gc3ZnVHJhbnNsYXRlWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZVsxXSArPSBzdmdUcmFuc2xhdGVbMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN2Z1NjYWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRyYW5zbGF0ZVswXSArICcsICcgKyB0cmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc2NhbGUgKyAnKScpO1xyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLm9uKCdkYmxjbGljay56b29tJywgbnVsbClcclxuICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICcxMDAlJyk7XHJcblxyXG4gICAgICAgIHN2Z1JlbGF0aW9uc2hpcHMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JlbGF0aW9uc2hpcHMnKTtcclxuXHJcbiAgICAgICAgc3ZnTm9kZXMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb1BhbmVsKGNvbnRhaW5lcikge1xyXG4gICAgICAgIHJldHVybiBjb250YWluZXIuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnbmVvNGpkMy1pbmZvJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBpc05vZGUsIHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIHZhciBlbGVtID0gaW5mby5hcHBlbmQoJ2EnKTtcclxuXHJcbiAgICAgICAgZWxlbS5hdHRyKCdocmVmJywgJyMnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCBjbHMpXHJcbiAgICAgICAgICAgIC5odG1sKCc8c3Ryb25nPicgKyBwcm9wZXJ0eSArICc8L3N0cm9uZz4nICsgKHZhbHVlID8gKCc6ICcgKyB2YWx1ZSkgOiAnJykpO1xyXG5cclxuICAgICAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgICAgICAgIGVsZW0uc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yIDogKGlzTm9kZSA/IGNsYXNzMmNvbG9yKHByb3BlcnR5KSA6IGRlZmF1bHRDb2xvcigpKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnYm9yZGVyLWNvbG9yJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogKGlzTm9kZSA/IGNsYXNzMmRhcmtlbkNvbG9yKHByb3BlcnR5KSA6IGRlZmF1bHREYXJrZW5Db2xvcigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2NvbG9yJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogJyNmZmYnO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoY2xzLCBub2RlKSB7XHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCB0cnVlLCBub2RlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KGNscywgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBmYWxzZSwgcHJvcGVydHksIHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudFJlbGF0aW9uc2hpcChjbHMsIHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHJlbGF0aW9uc2hpcCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kQ29udGV4dE1lbnUobm9kZSwgaW5kZXgpIHtcclxuICAgICAgICAvLyBDcmVhdGUgdGhlIGNvbnRhaW5lciBmb3IgdGhlIGNvbnRleHQgbWVudVxyXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnLmNvbnRleHQtbWVudScpLmRhdGEoWzFdKVxyXG4gICAgICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnY29udGV4dC1tZW51Jyk7XHJcblxyXG4gICAgICAgIC8vIEhpZGUgdGhlIGNvbnRleHQtbWVudSBpZiBpdCBnb2VzIG91dCBvZiBmb2N1cyBcclxuICAgICAgICBkMy5zZWxlY3QoJ2JvZHknKS5vbignY2xpY2suY29udGV4dC1tZW51JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBkMy5zZWxlY3QoJy5jb250ZXh0LW1lbnUnKS5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFwcGVuZCBkYXRhIHRvIHRoZSBjb250ZXh0IG1lbnVcclxuICAgICAgICBkMy5zZWxlY3RBbGwoJy5jb250ZXh0LW1lbnUnKVxyXG4gICAgICAgICAgICAuaHRtbCgnJylcclxuICAgICAgICAgICAgLmFwcGVuZCgndWwnKVxyXG4gICAgICAgICAgICAuc2VsZWN0QWxsKCdsaScpXHJcbiAgICAgICAgICAgIC5kYXRhKG9wdGlvbnMuY29udGV4dE1lbnUpXHJcbiAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2xpJylcclxuICAgICAgICAgICAgLm9uKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uaGFuZGxlcihub2RlKTtcclxuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCgnLmNvbnRleHQtbWVudScpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmFwcGVuZCgnaScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5pY29uO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiIFwiICsgZC50ZXh0O1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gU2hvdyB0aGUgY29udGV4dCBtZW51XHJcbiAgICAgICAgZDMuc2VsZWN0KCcuY29udGV4dC1tZW51JylcclxuICAgICAgICAgICAgLnN0eWxlKCdsZWZ0JywgKGQzLmV2ZW50LnBhZ2VYIC0gMikgKyAncHgnKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ3RvcCcsIChkMy5ldmVudC5wYWdlWSAtIDIpICsgJ3B4JylcclxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmROb2RlKCkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmVudGVyKClcclxuICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5vbignY29udGV4dG1lbnUnLCBhcHBlbmRDb250ZXh0TWVudSlcclxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGQudXVpZCA9IGd1aWQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnV1aWQ7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaGlnaGxpZ2h0LCBpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgPSAnbm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBkLmxhYmVsc1swXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW1hZ2UoZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1pbWFnZSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2xhc3NlcztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlQ2xpY2sgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24gKGQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRG91YmxlQ2xpY2sgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZURvdWJsZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbiAoZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVNb3VzZUxlYXZlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUxlYXZlKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuY2FsbChkMy5kcmFnKClcclxuICAgICAgICAgICAgICAgIC5vbignc3RhcnQnLCBkcmFnU3RhcnRlZClcclxuICAgICAgICAgICAgICAgIC5vbignZHJhZycsIGRyYWdnZWQpXHJcbiAgICAgICAgICAgICAgICAub24oJ2VuZCcsIGRyYWdFbmRlZCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGVUb0dyYXBoKCkge1xyXG4gICAgICAgIHZhciBuID0gYXBwZW5kTm9kZSgpO1xyXG5cclxuICAgICAgICBhcHBlbmRSaW5nVG9Ob2RlKG4pO1xyXG4gICAgICAgIGFwcGVuZE91dGxpbmVUb05vZGUobik7XHJcbiAgICAgICAgYXBwZW5kVGV4dFRvTm9kZShuKTtcclxuICAgICAgICBhcHBlbmRJbWFnZVRvTm9kZShuKTtcclxuICAgICAgICBhcHBlbmRJY29uVG9Ob2RlKG4pO1xyXG5cclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJY29uVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAndGV4dCBpY29uJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2ZmZmZmZicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnMjVweCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcclxuICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgcGFyc2VJbnQoTWF0aC5yb3VuZChvcHRpb25zLm5vZGVSYWRpdXMgKiAwLjMyKSkgKyAncHgnKVxyXG4gICAgICAgICAgICAuaHRtbChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIF9pY29uID0gb3B0aW9ucy5pY29uTWFwW2QubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIF9pY29uID8gJyYjeCcgKyBfaWNvbiA6ICcnO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbWFnZVRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdpbWFnZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMjRweCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCd4JywgJzVweCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgJzVweCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcyNHB4Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3V0bGluZVRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnb3V0bGluZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdyJywgb3B0aW9ucy5ub2RlUmFkaXVzKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yIDogY2xhc3MyY29sb3IoZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3R5bGUoJ3N0cm9rZScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogY2xhc3MyZGFya2VuQ29sb3IoZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZyhkKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmluZ1RvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmluZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdyJywgb3B0aW9ucy5ub2RlUmFkaXVzICogMS4xNilcclxuICAgICAgICAgICAgLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9TdHJpbmcoZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gdHJ1bmNhdGVUZXh0KHN0ciwgbGVuZ3RoKSB7XHJcblxyXG4gICAgICAgIHZhciBlbmRpbmcgPSAnLi4uJztcclxuXHJcbiAgICAgICAgaWYgKGxlbmd0aCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxlbmd0aCA9IDEwMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdHIubGVuZ3RoID4gbGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHIuc3Vic3RyaW5nKDAsIGxlbmd0aCAtIGVuZGluZy5sZW5ndGgpICsgZW5kaW5nO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFRleHRUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHZhciBnID0gbm9kZS5hcHBlbmQoJ2cnKTtcclxuXHJcbiAgICAgICAgZy5hcHBlbmQoJ3JlY3QnKVxyXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnODBweCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMjBweCcpXHJcbiAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjYmRjM2M3JylcclxuICAgICAgICAgICAgLmF0dHIoJ3knLCAyOClcclxuICAgICAgICAgICAgLmF0dHIoJ3gnLCAtNDApXHJcbiAgICAgICAgICAgIC5hdHRyKCdyeCcsIDEwKVxyXG4gICAgICAgICAgICAuYXR0cigncnknLCAxMCk7XHJcblxyXG4gICAgICAgIGcuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnByb3BlcnRpZXMubmFtZSA/IHRydW5jYXRlVGV4dChub2RlLnByb3BlcnRpZXMubmFtZSwgMTUpIDogbm9kZS5pZDtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIDEwKVxyXG4gICAgICAgICAgICAuYXR0cigneCcsIDApXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgMzcpXHJcbiAgICAgICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxyXG4gICAgICAgICAgICAuYXR0cignYWxpZ25tZW50LWJhc2VsaW5lJywgJ2NlbnRyYWwnKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwKCkge1xyXG4gICAgICAgIHJldHVybiByZWxhdGlvbnNoaXAuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGQudXVpZCA9IGd1aWQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnV1aWQ7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyZWxhdGlvbnNoaXAnKVxyXG4gICAgICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdXRsaW5lVG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdvdXRsaW5lJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2E1YWJiNicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ292ZXJsYXknKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzAwMDAwMCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnOHB4JylcclxuICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnR5cGU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKSB7XHJcbiAgICAgICAgdmFyIHJlbGF0aW9uc2hpcCA9IGFwcGVuZFJlbGF0aW9uc2hpcCgpLFxyXG4gICAgICAgICAgICB0ZXh0ID0gYXBwZW5kVGV4dFRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCksXHJcbiAgICAgICAgICAgIG91dGxpbmUgPSBhcHBlbmRPdXRsaW5lVG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKSxcclxuICAgICAgICAgICAgb3ZlcmxheSA9IGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBvdXRsaW5lOiBvdXRsaW5lLFxyXG4gICAgICAgICAgICBvdmVybGF5OiBvdmVybGF5LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IHJlbGF0aW9uc2hpcCxcclxuICAgICAgICAgICAgdGV4dDogdGV4dFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xhc3MyY29sb3IoY2xzKSB7XHJcbiAgICAgICAgdmFyIGNvbG9yID0gY2xhc3NlczJjb2xvcnNbY2xzXTtcclxuXHJcbiAgICAgICAgaWYgKCFjb2xvcikge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgIGNvbG9yID0gb3B0aW9ucy5jb2xvcnNbTWF0aC5taW4obnVtQ2xhc3Nlcywgb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMSldO1xyXG4gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW251bUNsYXNzZXMgJSBvcHRpb25zLmNvbG9ycy5sZW5ndGhdO1xyXG4gICAgICAgICAgICBjbGFzc2VzMmNvbG9yc1tjbHNdID0gY29sb3I7XHJcbiAgICAgICAgICAgIG51bUNsYXNzZXMrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGFzczJkYXJrZW5Db2xvcihjbHMpIHtcclxuICAgICAgICByZXR1cm4gZDMucmdiKGNsYXNzMmNvbG9yKGNscykpLmRhcmtlcigxKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGVhckluZm8oKSB7XHJcbiAgICAgICAgaW5mby5odG1sKCcnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb2xvcnMoKSB7XHJcbiAgICAgICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkxMCxcclxuICAgICAgICAvLyBkMy5zY2hlbWVDYXRlZ29yeTIwLFxyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICcjNjhiZGY2JywgLy8gbGlnaHQgYmx1ZVxyXG4gICAgICAgICAgICAnIzZkY2U5ZScsIC8vIGdyZWVuICMxXHJcbiAgICAgICAgICAgICcjZmFhZmMyJywgLy8gbGlnaHQgcGlua1xyXG4gICAgICAgICAgICAnI2YyYmFmNicsIC8vIHB1cnBsZVxyXG4gICAgICAgICAgICAnI2ZmOTI4YycsIC8vIGxpZ2h0IHJlZFxyXG4gICAgICAgICAgICAnI2ZjZWE3ZScsIC8vIGxpZ2h0IHllbGxvd1xyXG4gICAgICAgICAgICAnI2ZmYzc2NicsIC8vIGxpZ2h0IG9yYW5nZVxyXG4gICAgICAgICAgICAnIzQwNWY5ZScsIC8vIG5hdnkgYmx1ZVxyXG4gICAgICAgICAgICAnI2E1YWJiNicsIC8vIGRhcmsgZ3JheVxyXG4gICAgICAgICAgICAnIzc4Y2VjYicsIC8vIGdyZWVuICMyLFxyXG4gICAgICAgICAgICAnI2I4OGNiYicsIC8vIGRhcmsgcHVycGxlXHJcbiAgICAgICAgICAgICcjY2VkMmQ5JywgLy8gbGlnaHQgZ3JheVxyXG4gICAgICAgICAgICAnI2U4NDY0NicsIC8vIGRhcmsgcmVkXHJcbiAgICAgICAgICAgICcjZmE1Zjg2JywgLy8gZGFyayBwaW5rXHJcbiAgICAgICAgICAgICcjZmZhYjFhJywgLy8gZGFyayBvcmFuZ2VcclxuICAgICAgICAgICAgJyNmY2RhMTknLCAvLyBkYXJrIHllbGxvd1xyXG4gICAgICAgICAgICAnIzc5N2I4MCcsIC8vIGJsYWNrXHJcbiAgICAgICAgICAgICcjYzlkOTZmJywgLy8gcGlzdGFjY2hpb1xyXG4gICAgICAgICAgICAnIzQ3OTkxZicsIC8vIGdyZWVuICMzXHJcbiAgICAgICAgICAgICcjNzBlZGVlJywgLy8gdHVycXVvaXNlXHJcbiAgICAgICAgICAgICcjZmY3NWVhJyAgLy8gcGlua1xyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29udGFpbnMoYXJyYXksIGlkKSB7XHJcbiAgICAgICAgdmFyIGZpbHRlciA9IGFycmF5LmZpbHRlcihmdW5jdGlvbiAoZWxlbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbS5pZCA9PT0gaWQ7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmaWx0ZXIubGVuZ3RoID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0Q29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucmVsYXRpb25zaGlwQ29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVmYXVsdERhcmtlbkNvbG9yKCkge1xyXG4gICAgICAgIHJldHVybiBkMy5yZ2Iob3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMV0pLmRhcmtlcigxKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnRW5kZWQoZCkge1xyXG4gICAgICAgIGlmICghZDMuZXZlbnQuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ0VuZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcHRpb25zLm9uTm9kZURyYWdFbmQoZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xyXG4gICAgICAgIHN0aWNrTm9kZShkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnU3RhcnRlZChkKSB7XHJcbiAgICAgICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjMpLnJlc3RhcnQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGQuZnggPSBkLng7XHJcbiAgICAgICAgZC5meSA9IGQueTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURyYWdTdGFydCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcHRpb25zLm9uTm9kZURyYWdTdGFydChkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iajEsIG9iajIpIHtcclxuICAgICAgICB2YXIgb2JqID0ge307XHJcblxyXG4gICAgICAgIG1lcmdlKG9iaiwgb2JqMSk7XHJcbiAgICAgICAgbWVyZ2Uob2JqLCBvYmoyKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbWFnZShkKSB7XHJcbiAgICAgICAgdmFyIGksIGltYWdlc0ZvckxhYmVsLCBpbWcsIGltZ0xldmVsLCBsYWJlbCwgbGFiZWxQcm9wZXJ0eVZhbHVlLCBwcm9wZXJ0eSwgdmFsdWU7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmltYWdlcykge1xyXG4gICAgICAgICAgICBpbWFnZXNGb3JMYWJlbCA9IG9wdGlvbnMuaW1hZ2VNYXBbZC5sYWJlbHNbMF1dO1xyXG5cclxuICAgICAgICAgICAgaWYgKGltYWdlc0ZvckxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICBpbWdMZXZlbCA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGltYWdlc0ZvckxhYmVsLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxQcm9wZXJ0eVZhbHVlID0gaW1hZ2VzRm9yTGFiZWxbaV0uc3BsaXQoJ3wnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGQubGFiZWxzWzBdID09PSBsYWJlbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoIXByb3BlcnR5IHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCkgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCF2YWx1ZSB8fCBkLnByb3BlcnRpZXNbcHJvcGVydHldID09PSB2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGggPiBpbWdMZXZlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nID0gb3B0aW9ucy5pbWFnZXNbaW1hZ2VzRm9yTGFiZWxbaV1dO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nTGV2ZWwgPSBsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW1nO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXQoX3NlbGVjdG9yLCBfb3B0aW9ucykge1xyXG5cclxuICAgICAgICBtZXJnZShvcHRpb25zLCBfb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25zKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuc2hvd0ljb25zID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghb3B0aW9ucy5taW5Db2xsaXNpb24pIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5taW5Db2xsaXNpb24gPSBvcHRpb25zLm5vZGVSYWRpdXMgKiAyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VsZWN0b3IgPSBfc2VsZWN0b3I7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lciA9IGQzLnNlbGVjdChzZWxlY3Rvcik7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lci5hdHRyKCdjbGFzcycsICduZW80amQzJylcclxuICAgICAgICAgICAgLmh0bWwoJycpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbmZvUGFuZWwpIHtcclxuICAgICAgICAgICAgaW5mbyA9IGFwcGVuZEluZm9QYW5lbChjb250YWluZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXBwZW5kR3JhcGgoY29udGFpbmVyKTtcclxuICAgICAgICBzaW11bGF0aW9uID0gaW5pdFNpbXVsYXRpb24oKTtcclxuICAgICAgICBpZiAob3B0aW9ucy5uZW80akRhdGEpIHtcclxuICAgICAgICAgICAgbG9hZE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLm5lbzRqRGF0YVVybCkge1xyXG4gICAgICAgICAgICBsb2FkTmVvNGpEYXRhRnJvbVVybChvcHRpb25zLm5lbzRqRGF0YVVybCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6IGJvdGggbmVvNGpEYXRhIGFuZCBuZW80akRhdGFVcmwgYXJlIGVtcHR5IScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwc0NvcHkgPSByZWxhdGlvbnNoaXBzLm1hcChmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgYSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdFNpbXVsYXRpb24oKSB7XHJcbiAgICAgICAgdmFyIHNpbXVsYXRpb24gPSBkMy5mb3JjZVNpbXVsYXRpb24oKVxyXG4gICAgICAgICAgICAuZm9yY2UoJ2NvbGxpZGUnLCBkMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm1pbkNvbGxpc2lvbjtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY2hhcmdlJywgZDMuZm9yY2VNYW55Qm9keSgpXHJcbiAgICAgICAgICAgICAgICAuc3RyZW5ndGgoLTIwKVxyXG4gICAgICAgICAgICAgICAgLmRpc3RhbmNlTWF4KDE1MClcclxuICAgICAgICAgICAgICAgIC5kaXN0YW5jZU1pbig1MCkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnbGluaycsIGQzLmZvcmNlTGluaygpXHJcbiAgICAgICAgICAgICAgICAuaWQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5pZDtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZGlzdGFuY2UoNTApXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICAgLmZvcmNlKCdjZW50ZXInLCBkMy5mb3JjZUNlbnRlcihzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRXaWR0aCAvIDIsIHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LmNsaWVudEhlaWdodCAvIDIpKVxyXG4gICAgICAgICAgICAub24oJ3RpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB0aWNrKCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuem9vbUZpdCAmJiAhanVzdExvYWRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGp1c3RMb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHpvb21GaXQoMik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gc2ltdWxhdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkTmVvNGpEYXRhKCkge1xyXG4gICAgICAgIG5vZGVzID0gW107XHJcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IFtdO1xyXG5cclxuICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhKG9wdGlvbnMubmVvNGpEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkTmVvNGpEYXRhRnJvbVVybChuZW80akRhdGFVcmwpIHtcclxuICAgICAgICBub2RlcyA9IFtdO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSBbXTtcclxuXHJcbiAgICAgICAgZDMuanNvbihuZW80akRhdGFVcmwsIGZ1bmN0aW9uIChlcnJvciwgZGF0YSkge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhKGRhdGEpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1lcmdlKHRhcmdldCwgc291cmNlKSB7XHJcbiAgICAgICAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICB0YXJnZXRbcHJvcGVydHldID0gc291cmNlW3Byb3BlcnR5XTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBuZW80akRhdGFUb0QzRGF0YShkYXRhKSB7XHJcbiAgICAgICAgdmFyIGdyYXBoID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICByZXN1bHQuZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLm5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbnRhaW5zKGdyYXBoLm5vZGVzLCBub2RlLmlkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5ub2Rlcy5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbnRhaW5zKGdyYXBoLnJlbGF0aW9uc2hpcHMsIHJlbGF0aW9uc2hpcC5pZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVsYXRpb25zaGlwLnNvdXJjZSA9IHJlbGF0aW9uc2hpcC5zdGFydE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC50YXJnZXQgPSByZWxhdGlvbnNoaXAuZW5kTm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGgucmVsYXRpb25zaGlwcy5wdXNoKHJlbGF0aW9uc2hpcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYS5zb3VyY2UgPiBiLnNvdXJjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGEuc291cmNlIDwgYi5zb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhLnRhcmdldCA+IGIudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEudGFyZ2V0IDwgYi50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gMCAmJiBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0uc291cmNlID09PSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLnNvdXJjZSAmJiBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0udGFyZ2V0ID09PSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0ubGlua251bSA9IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpIC0gMV0ubGlua251bSArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLmxpbmtudW0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBncmFwaDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmREYXRhVG9Ob2RlKHNvdXJjZU5vZGUsIG5ld05vZGVzLCBuZXdSZWxhdGlvbnNoaXBzKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBuZXdOb2Rlc1tpXS5pZCxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogbmV3Tm9kZXNbaV0ubGFiZWxzLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogbmV3Tm9kZXNbaV0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHg6IHNvdXJjZU5vZGUueCxcclxuICAgICAgICAgICAgICAgIHk6IHNvdXJjZU5vZGUueVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBkYXRhLm5vZGVzW2RhdGEubm9kZXMubGVuZ3RoXSA9IG5vZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG5ld1JlbGF0aW9uc2hpcHMubGVuZ3RoOyBqKyspIHtcclxuXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBuZXdSZWxhdGlvbnNoaXBzW2pdLmlkLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogbmV3UmVsYXRpb25zaGlwc1tqXS50eXBlLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBuZXdSZWxhdGlvbnNoaXBzW2pdLnN0YXJ0Tm9kZSxcclxuICAgICAgICAgICAgICAgIGVuZE5vZGU6IG5ld1JlbGF0aW9uc2hpcHNbal0uZW5kTm9kZSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld1JlbGF0aW9uc2hpcHNbal0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogbmV3UmVsYXRpb25zaGlwc1tqXS5zb3VyY2UsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IG5ld1JlbGF0aW9uc2hpcHNbal0uZW5kTm9kZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGRhdGEpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGUoY3gsIGN5LCB4LCB5LCBhbmdsZSkge1xyXG4gICAgICAgIHZhciByYWRpYW5zID0gKE1hdGguUEkgLyAxODApICogYW5nbGUsXHJcbiAgICAgICAgICAgIGNvcyA9IE1hdGguY29zKHJhZGlhbnMpLFxyXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihyYWRpYW5zKSxcclxuICAgICAgICAgICAgbnggPSAoY29zICogKHggLSBjeCkpICsgKHNpbiAqICh5IC0gY3kpKSArIGN4LFxyXG4gICAgICAgICAgICBueSA9IChjb3MgKiAoeSAtIGN5KSkgLSAoc2luICogKHggLSBjeCkpICsgY3k7XHJcblxyXG4gICAgICAgIHJldHVybiB7IHg6IG54LCB5OiBueSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZVBvaW50KGMsIHAsIGFuZ2xlKSB7XHJcbiAgICAgICAgcmV0dXJuIHJvdGF0ZShjLngsIGMueSwgcC54LCBwLnksIGFuZ2xlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGlvbihzb3VyY2UsIHRhcmdldCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRhcmdldC55IC0gc291cmNlLnksIHRhcmdldC54IC0gc291cmNlLngpICogMTgwIC8gTWF0aC5QSTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaXplKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBub2Rlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IHJlbGF0aW9uc2hpcHMubGVuZ3RoXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgICAgZnVuY3Rpb24gc21vb3RoVHJhbnNmb3JtKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUpIHtcclxuICAgICAgICAgICAgdmFyIGFuaW1hdGlvbk1pbGxpc2Vjb25kcyA9IDUwMDAsXHJcbiAgICAgICAgICAgICAgICB0aW1lb3V0TWlsbGlzZWNvbmRzID0gNTAsXHJcbiAgICAgICAgICAgICAgICBzdGVwcyA9IHBhcnNlSW50KGFuaW1hdGlvbk1pbGxpc2Vjb25kcyAvIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIDEsIHN0ZXBzKTtcclxuICAgICAgICAgICAgfSwgdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgZnVuY3Rpb24gc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCBzdGVwLCBzdGVwcykge1xyXG4gICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSBzdGVwIC8gc3RlcHM7XHJcbiAgICBcclxuICAgICAgICAgICAgZWxlbS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAodHJhbnNsYXRlWzBdICogcHJvZ3Jlc3MpICsgJywgJyArICh0cmFuc2xhdGVbMV0gKiBwcm9ncmVzcykgKyAnKSBzY2FsZSgnICsgKHNjYWxlICogcHJvZ3Jlc3MpICsgJyknKTtcclxuICAgIFxyXG4gICAgICAgICAgICBpZiAoc3RlcCA8IHN0ZXBzKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgc3RlcCArIDEsIHN0ZXBzKTtcclxuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgKi9cclxuICAgIGZ1bmN0aW9uIHN0aWNrTm9kZShkKSB7XHJcbiAgICAgICAgZC5meCA9IGQzLmV2ZW50Lng7XHJcbiAgICAgICAgZC5meSA9IGQzLmV2ZW50Lnk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGljaygpIHtcclxuICAgICAgICB0aWNrTm9kZXMoKTtcclxuICAgICAgICB0aWNrUmVsYXRpb25zaGlwcygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tOb2RlcygpIHtcclxuICAgICAgICBpZiAobm9kZSkge1xyXG5cclxuICAgICAgICAgICAgbm9kZS5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQueCArICcsICcgKyBkLnkgKyAnKSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwcygpIHtcclxuICAgICAgICBpZiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRpc3RhbmNlQmV0d2Vlbk5vZGVzID0gTWF0aC5zcXJ0KE1hdGgucG93KGQuc291cmNlLnggLSBkLnRhcmdldC54LCAyKSArIE1hdGgucG93KGQuc291cmNlLnkgLSBkLnRhcmdldC55LCAyKSk7XHJcbiAgICAgICAgICAgICAgICAvLyBGaXggbm9kZXMgaWYgdGhlIGRpc3RhbmNlIGlzIGJpZ2dlciB0aGFuIGluZGljYXRlZCBsZW5ndGhcclxuICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZUJldHdlZW5Ob2RlcyA+IDQwMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGQuc291cmNlLmZ4ID0gZC5zb3VyY2UueDtcclxuICAgICAgICAgICAgICAgICAgICBkLnNvdXJjZS5meSA9IGQuc291cmNlLnk7XHJcbiAgICAgICAgICAgICAgICAgICAgZC50YXJnZXQuZnggPSBkLnRhcmdldC54O1xyXG4gICAgICAgICAgICAgICAgICAgIGQudGFyZ2V0LmZ5ID0gZC50YXJnZXQueTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgZC5zb3VyY2UueCArICcsICcgKyBkLnNvdXJjZS55ICsgJykgcm90YXRlKCcgKyBhbmdsZSArICcpJztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc1RleHRzKCk7XHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKTtcclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc091dGxpbmVzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcC5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIHJlbCA9IGQzLnNlbGVjdCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIG91dGxpbmUgPSByZWwuc2VsZWN0KCcub3V0bGluZScpLFxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IHJlbC5zZWxlY3QoJy50ZXh0Jyk7XHJcblxyXG4gICAgICAgICAgICBvdXRsaW5lLmF0dHIoJ2QnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Qm91bmRpbmdCb3ggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBhZGRpbmcgPSA1LFxyXG4gICAgICAgICAgICAgICAgICAgIHUgPSB1bml0YXJ5VmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dE1hcmdpbiA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueCkgKiAwLjUsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LnkpICogMC41IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogdGV4dE1hcmdpbi54LCB5OiB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEEyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggKyAobi54IC0gdS54KSAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSArIChuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggKyAoLSBuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55ICsgKC0gbi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRGMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRHMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBMS54ICsgJyAnICsgcm90YXRlZFBvaW50QTEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMS54ICsgJyAnICsgcm90YXRlZFBvaW50QjEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMS54ICsgJyAnICsgcm90YXRlZFBvaW50QzEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMS54ICsgJyAnICsgcm90YXRlZFBvaW50RDEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBaIE0gJyArIHJvdGF0ZWRQb2ludEEyLnggKyAnICcgKyByb3RhdGVkUG9pbnRBMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIyLnggKyAnICcgKyByb3RhdGVkUG9pbnRCMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMyLnggKyAnICcgKyByb3RhdGVkUG9pbnRDMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQyLnggKyAnICcgKyByb3RhdGVkUG9pbnREMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEUyLnggKyAnICcgKyByb3RhdGVkUG9pbnRFMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEYyLnggKyAnICcgKyByb3RhdGVkUG9pbnRGMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEcyLnggKyAnICcgKyByb3RhdGVkUG9pbnRHMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIFonO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc092ZXJsYXlzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE92ZXJsYXkuYXR0cignZCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG4xID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0LCA1MCksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgLSBuLngsIHk6IDAgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIG4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QyA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCArIG4ueCAtIG4xLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55ICsgbi55IC0gbjEueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnREID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyBuLnggLSBuMS54LCB5OiAwICsgbi55IC0gbjEueSB9LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ00gJyArIHJvdGF0ZWRQb2ludEEueCArICcgJyArIHJvdGF0ZWRQb2ludEEueSArXHJcbiAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIueCArICcgJyArIHJvdGF0ZWRQb2ludEIueSArXHJcbiAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMueCArICcgJyArIHJvdGF0ZWRQb2ludEMueSArXHJcbiAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQueCArICcgJyArIHJvdGF0ZWRQb2ludEQueSArXHJcbiAgICAgICAgICAgICAgICAnIFonO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzVGV4dHMoKSB7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwVGV4dC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICB2YXIgYW5nbGUgPSAocm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSArIDM2MCkgJSAzNjAsXHJcbiAgICAgICAgICAgICAgICBtaXJyb3IgPSBhbmdsZSA+IDkwICYmIGFuZ2xlIDwgMjcwLFxyXG4gICAgICAgICAgICAgICAgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgbldlaWdodCA9IG1pcnJvciA/IDIgOiAtMyxcclxuICAgICAgICAgICAgICAgIHBvaW50ID0geyB4OiAoZC50YXJnZXQueCAtIGQuc291cmNlLngpICogMC41ICsgbi54ICogbldlaWdodCwgeTogKGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55KSAqIDAuNSArIG4ueSAqIG5XZWlnaHQgfSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludCA9IHJvdGF0ZVBvaW50KGNlbnRlciwgcG9pbnQsIGFuZ2xlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyByb3RhdGVkUG9pbnQueCArICcsICcgKyByb3RhdGVkUG9pbnQueSArICcpIHJvdGF0ZSgnICsgKG1pcnJvciA/IDE4MCA6IDApICsgJyknO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRvU3RyaW5nKGQpIHtcclxuICAgICAgICB2YXIgcyA9IGQubGFiZWxzID8gZC5sYWJlbHNbMF0gOiBkLnR5cGU7XHJcblxyXG4gICAgICAgIHMgKz0gJyAoPGlkPjogJyArIGQuaWQ7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKGQucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgcyArPSAnLCAnICsgcHJvcGVydHkgKyAnOiAnICsgSlNPTi5zdHJpbmdpZnkoZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHMgKz0gJyknO1xyXG5cclxuICAgICAgICByZXR1cm4gcztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bml0YXJ5Tm9ybWFsVmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgIHZlY3RvciA9IHVuaXRhcnlWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCk7XHJcblxyXG4gICAgICAgIHJldHVybiByb3RhdGVQb2ludChjZW50ZXIsIHZlY3RvciwgOTApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVuaXRhcnlWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCkge1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoTWF0aC5wb3codGFyZ2V0LnggLSBzb3VyY2UueCwgMikgKyBNYXRoLnBvdyh0YXJnZXQueSAtIHNvdXJjZS55LCAyKSkgLyBNYXRoLnNxcnQobmV3TGVuZ3RoIHx8IDEpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiAodGFyZ2V0LnggLSBzb3VyY2UueCkgLyBsZW5ndGgsXHJcbiAgICAgICAgICAgIHk6ICh0YXJnZXQueSAtIHNvdXJjZS55KSAvIGxlbmd0aCxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKSB7XHJcbiAgICAgICAgdXBkYXRlTm9kZXNBbmRSZWxhdGlvbnNoaXBzKGQzRGF0YS5ub2RlcywgZDNEYXRhLnJlbGF0aW9uc2hpcHMsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVdpdGhOZW80akRhdGEobmVvNGpEYXRhKSB7XHJcbiAgICAgICAgdmFyIGQzRGF0YSA9IG5lbzRqRGF0YVRvRDNEYXRhKG5lbzRqRGF0YSk7XHJcbiAgICAgICAgdXBkYXRlV2l0aEQzRGF0YShkM0RhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUluZm8oZCkge1xyXG4gICAgICAgIGNsZWFySW5mbygpO1xyXG5cclxuICAgICAgICBpZiAoZC5sYWJlbHMpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnRDbGFzcygnY2xhc3MnLCBkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnRSZWxhdGlvbnNoaXAoJ2NsYXNzJywgZC50eXBlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50UHJvcGVydHkoJ3Byb3BlcnR5JywgJyZsdDtpZCZndDsnLCBkLmlkKTtcclxuXHJcbiAgICAgICAgT2JqZWN0LmtleXMoZC5wcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsIHByb3BlcnR5LCBKU09OLnN0cmluZ2lmeShkLnByb3BlcnRpZXNbcHJvcGVydHldKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlTm9kZXMobiwgYXBwZW5kKSB7XHJcbiAgICAgICAgaWYgKGFwcGVuZCkge1xyXG4gICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShub2Rlcywgbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBub2RlID0gc3ZnTm9kZXMuc2VsZWN0QWxsKCcubm9kZScpXHJcbiAgICAgICAgICAgIC5kYXRhKG5vZGVzLCBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZC5pZDsgfSk7XHJcbiAgICAgICAgdmFyIG5vZGVFbnRlciA9IGFwcGVuZE5vZGVUb0dyYXBoKCk7XHJcbiAgICAgICAgbm9kZSA9IG5vZGVFbnRlci5tZXJnZShub2RlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVOb2Rlc0FuZFJlbGF0aW9uc2hpcHMobiwgciwgYXBwZW5kKSB7XHJcbiAgICAgICAgdXBkYXRlUmVsYXRpb25zaGlwcyhyLCBhcHBlbmQpO1xyXG4gICAgICAgIHVwZGF0ZU5vZGVzKG4sIGFwcGVuZCk7XHJcblxyXG4gICAgICAgIHNpbXVsYXRpb24ubm9kZXMobm9kZXMpO1xyXG4gICAgICAgIHNpbXVsYXRpb24uZm9yY2UoJ2xpbmsnKS5saW5rcyhyZWxhdGlvbnNoaXBzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVSZWxhdGlvbnNoaXBzKHIsIGFwcGVuZCkge1xyXG4gICAgICAgIGlmIChhcHBlbmQpIHtcclxuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocmVsYXRpb25zaGlwcywgcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSBzdmdSZWxhdGlvbnNoaXBzLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgIC5kYXRhKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuXHJcbiAgICAgICAgdmFyIHJlbGF0aW9uc2hpcEVudGVyID0gYXBwZW5kUmVsYXRpb25zaGlwVG9HcmFwaCgpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSByZWxhdGlvbnNoaXBFbnRlci5yZWxhdGlvbnNoaXAubWVyZ2UocmVsYXRpb25zaGlwKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm91dGxpbmUnKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdXRsaW5lID0gcmVsYXRpb25zaGlwRW50ZXIub3V0bGluZS5tZXJnZShyZWxhdGlvbnNoaXBPdXRsaW5lKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3ZlcmxheSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm92ZXJsYXknKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5ID0gcmVsYXRpb25zaGlwRW50ZXIub3ZlcmxheS5tZXJnZShyZWxhdGlvbnNoaXBPdmVybGF5KTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwVGV4dCA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLnRleHQnKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0ID0gcmVsYXRpb25zaGlwRW50ZXIudGV4dC5tZXJnZShyZWxhdGlvbnNoaXBUZXh0KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB2ZXJzaW9uKCkge1xyXG4gICAgICAgIHJldHVybiBWRVJTSU9OO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHpvb21GaXQodHJhbnNpdGlvbkR1cmF0aW9uKSB7XHJcbiAgICAgICAgdmFyIGJvdW5kcyA9IHN2Zy5ub2RlKCkuZ2V0QkJveCgpLFxyXG4gICAgICAgICAgICBwYXJlbnQgPSBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudCxcclxuICAgICAgICAgICAgZnVsbFdpZHRoID0gcGFyZW50LmNsaWVudFdpZHRoLFxyXG4gICAgICAgICAgICBmdWxsSGVpZ2h0ID0gcGFyZW50LmNsaWVudEhlaWdodCxcclxuICAgICAgICAgICAgd2lkdGggPSBib3VuZHMud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA9IGJvdW5kcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIG1pZFggPSBib3VuZHMueCArIHdpZHRoIC8gMixcclxuICAgICAgICAgICAgbWlkWSA9IGJvdW5kcy55ICsgaGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgaWYgKHdpZHRoID09PSAwIHx8IGhlaWdodCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47IC8vIG5vdGhpbmcgdG8gZml0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdmdTY2FsZSA9IDAuODUgLyBNYXRoLm1heCh3aWR0aCAvIGZ1bGxXaWR0aCwgaGVpZ2h0IC8gZnVsbEhlaWdodCk7XHJcbiAgICAgICAgc3ZnVHJhbnNsYXRlID0gW2Z1bGxXaWR0aCAvIDIgLSBzdmdTY2FsZSAqIG1pZFgsIGZ1bGxIZWlnaHQgLyAyIC0gc3ZnU2NhbGUgKiBtaWRZXTtcclxuXHJcbiAgICAgICAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHN2Z1RyYW5zbGF0ZVswXSArICcsICcgKyBzdmdUcmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc3ZnU2NhbGUgKyAnKScpO1xyXG4gICAgICAgIC8vICAgICAgICBzbW9vdGhUcmFuc2Zvcm0oc3ZnVHJhbnNsYXRlLCBzdmdTY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVzZXRXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbihfb3B0aW9ucywgeyBuZW80akRhdGE6IG5lbzRqRGF0YSwgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQgfSk7XHJcbiAgICAgICAgaW5pdChfc2VsZWN0b3IsIG5ld09wdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUoc291cmNlTm9kZSkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSByZWxhdGlvbnNoaXBzLmZpbHRlcihmdW5jdGlvbiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgIGlmIChyZWxhdGlvbnNoaXAuc291cmNlID09PSBzb3VyY2VOb2RlIHx8IHJlbGF0aW9uc2hpcC50YXJnZXQgPT09IHNvdXJjZU5vZGUpIHtcclxuICAgICAgICAgICAgICAgIGQzLnNlbGVjdChcIiNcIiArIHJlbGF0aW9uc2hpcC51dWlkKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbm9kZXMgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGUgIT09IHNvdXJjZU5vZGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGQzLnNlbGVjdChcIiNcIiArIHNvdXJjZU5vZGUudXVpZCkucmVtb3ZlKCk7XHJcbiAgICAgICAgdXBkYXRlTm9kZXNBbmRSZWxhdGlvbnNoaXBzKG5vZGVzLCByZWxhdGlvbnNoaXBzLCBmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ3VpZCgpIHtcclxuICAgICAgICBmdW5jdGlvbiBzNCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXHJcbiAgICAgICAgICAgICAgICAudG9TdHJpbmcoMTYpXHJcbiAgICAgICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJ2cnICsgczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKTtcclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVWaWV3cyhrZXlzKSB7XHJcbiAgICAgICAgZDMuc2VsZWN0QWxsKFwiLnZpZXdzXCIpLnJlbW92ZSgpO1xyXG4gICAgICAgIHZhciBjaXJjbGVzID0gZDMuc2VsZWN0KCdzdmcnKS5zZWxlY3RBbGwoJ3JlY3Qudmlld3MnKS5kYXRhKGtleXMpO1xyXG4gICAgICAgIHZhciByID0gMjA7XHJcbiAgICAgICAgY2lyY2xlcy5lbnRlcigpLmFwcGVuZCgncmVjdCcpLmNsYXNzZWQoJ3ZpZXdzJywgdHJ1ZSlcclxuICAgICAgICAgICAgLmF0dHIoJ3gnLCByKVxyXG4gICAgICAgICAgICAuYXR0cigneScsIGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGtleXMuaW5kZXhPZihub2RlKSArIDEpICogMi4yICogciArIDI3O1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cigncngnLCByIC8gMylcclxuICAgICAgICAgICAgLmF0dHIoJ3J4JywgciAvIDMpXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIHIgKiA0KVxyXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgcilcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbG9ycygpW2tleXMuaW5kZXhPZihub2RlKSArIDFdO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignc3Ryb2tlJywgZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIiMwMDAwMDBcIjtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZS13aWR0aCcsIGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIwLjVweFwiO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cihcImN1cnNvclwiLCBcInBvaW50ZXJcIilcclxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c0NsaWNrSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25WaWV3c0NsaWNrSGFuZGxlcihuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAobikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uVmlld3NNb3VzZU92ZXJIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzTW91c2VPdmVySGFuZGxlcihuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbiAobikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uVmlld3NNb3VzZUxlYXZlSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25WaWV3c01vdXNlTGVhdmVIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdmFyIHRleHQgPSBkMy5zZWxlY3QoJ3N2ZycpLnNlbGVjdEFsbCgndGV4dC52aWV3cycpLmRhdGEoa2V5cyk7XHJcbiAgICAgICAgdGV4dC5lbnRlcigpLmFwcGVuZCgndGV4dCcpLmNsYXNzZWQoJ3ZpZXdzJywgdHJ1ZSlcclxuICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ2xlZnQnKVxyXG4gICAgICAgICAgICAuYXR0cignZm9udC13ZWlnaHQnLCAnYm9sZCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdzdHJva2Utd2lkdGgnLCAnMCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdzdHJva2UtY29sb3InLCAnd2hpdGUnKVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjNjk2OTY5JylcclxuICAgICAgICAgICAgLmF0dHIoJ3gnLCAyICogcilcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIFwiMTBweFwiKVxyXG4gICAgICAgICAgICAuYXR0cihcImN1cnNvclwiLCBcInBvaW50ZXJcIilcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgICAgICB9KS5hdHRyKCd5JywgZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAoa2V5cy5pbmRleE9mKG5vZGUpICsgMSkgKiAyLjIgKiByICsgNDA7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAobikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uVmlld3NDbGlja0hhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NDbGlja0hhbmRsZXIobik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzTW91c2VPdmVySGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25WaWV3c01vdXNlT3ZlckhhbmRsZXIobik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c01vdXNlTGVhdmVIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzTW91c2VMZWF2ZUhhbmRsZXIobik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjaXJjbGVzLmV4aXQoKS5yZW1vdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBoaWdobGlnaHROb2Rlcyhub2Rlcykge1xyXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgZDMuc2VsZWN0KFwiI1wiICsgbm9kZS51dWlkKVxyXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoJ25vZGUtaGlnaGxpZ2h0ZWQnLCB0cnVlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bkhpZ2hsaWdodE5vZGVzKG5vZGVzKSB7XHJcbiAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICBkMy5zZWxlY3QoXCIjXCIgKyBub2RlLnV1aWQpXHJcbiAgICAgICAgICAgICAgICAuY2xhc3NlZCgnbm9kZS1oaWdobGlnaHRlZCcsIGZhbHNlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvcmllbnRGb3JjZUdyYXBoVmVydGljYWwocHJpb3JpdGllcykge1xyXG4gICAgICAgIG5vZGVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHByaW9yaXRpZXNbYS5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV0gLSBwcmlvcml0aWVzW2IubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgcHJpb3JpdHkgPSAwO1xyXG4gICAgICAgIHZhciB4ID0gNzAwO1xyXG4gICAgICAgIHZhciB5ID0gMjAwO1xyXG5cclxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIGlmIChwcmlvcml0aWVzW25vZGUubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldICE9PSBwcmlvcml0eSkge1xyXG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSBwcmlvcml0aWVzW25vZGUubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgICAgICAgICAgeSArPSAxMzA7XHJcbiAgICAgICAgICAgICAgICB4ID0gNzAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHggKz0gMTUwO1xyXG5cclxuICAgICAgICAgICAgbm9kZS5meCA9IHg7XHJcbiAgICAgICAgICAgIG5vZGUuZnkgPSB5O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9yaWVudEZvcmNlR3JhcGhIb3Jpem9udGFsKHByaW9yaXRpZXMpIHtcclxuICAgICAgICBub2Rlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcmlvcml0aWVzW2EubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldIC0gcHJpb3JpdGllc1tiLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdmFyIHByaW9yaXR5ID0gMDtcclxuICAgICAgICB2YXIgeCA9IDcwMDtcclxuICAgICAgICB2YXIgeSA9IDIwMDtcclxuXHJcbiAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICBpZiAocHJpb3JpdGllc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSAhPT0gcHJpb3JpdHkpIHtcclxuICAgICAgICAgICAgICAgIHByaW9yaXR5ID0gcHJpb3JpdGllc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXTtcclxuICAgICAgICAgICAgICAgIHkgPSAyMDA7XHJcbiAgICAgICAgICAgICAgICB4ICs9IDE1MDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB5ICs9IDE1MDtcclxuICAgICAgICAgICAgbm9kZS5meCA9IHg7XHJcbiAgICAgICAgICAgIG5vZGUuZnkgPSB5O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEdyYXBoKCkge1xyXG4gICAgICAgIHJldHVybiB7ICdub2Rlcyc6IG5vZGVzLCAncmVsYXRpb25zaGlwcyc6IHJlbGF0aW9uc2hpcHMgfTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZXhwYW5kTm9kZShjdXJyZW50Tm9kZSkge1xyXG5cclxuICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzID0gc2l6ZSgpO1xyXG5cclxuICAgICAgICBjdXJyZW50Tm9kZS5wcmV2aW91cy5mb3JFYWNoKGZ1bmN0aW9uIChuLCBpKSB7XHJcbiAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgbm9kZVxyXG5cclxuICAgICAgICAgICAgdmFyIHJhbmQgPSArIE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiAyMDApIC0gNzUpO1xyXG4gICAgICAgICAgICB2YXIgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBuLm5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICBsYWJlbHM6IG4ubm9kZS5sYWJlbHMsXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBuLm5vZGUucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHg6IGN1cnJlbnROb2RlLnggKyByYW5kLFxyXG4gICAgICAgICAgICAgICAgeTogY3VycmVudE5vZGUueSArIHJhbmQsXHJcbiAgICAgICAgICAgICAgICBmeDogY3VycmVudE5vZGUuZnggKyByYW5kLFxyXG4gICAgICAgICAgICAgICAgZnk6IGN1cnJlbnROb2RlLmZ5ICsgcmFuZCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tkYXRhLm5vZGVzLmxlbmd0aF0gPSBub2RlO1xyXG5cclxuICAgICAgICAgICAgLy8gQ3JlYXRlIGxpbmsgZnJvbSBuZXcgbm9kZSB0byBpdHMgcGFyZW50XHJcbiAgICAgICAgICAgIGRhdGEucmVsYXRpb25zaGlwc1tkYXRhLnJlbGF0aW9uc2hpcHMubGVuZ3RoXSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBuLmxpbmsuaWQsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBuLmxpbmsudHlwZSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG4ubGluay5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBub2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogY3VycmVudE5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IG5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGN1cnJlbnROb2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmQgb3JpZ2luYWwgbGlua3MgXHJcblxyXG4gICAgICAgICAgICB2YXIgbGlua3MgPSByZWxhdGlvbnNoaXBzQ29weS5maWx0ZXIoZnVuY3Rpb24gKGxpbmspIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsaW5rLnNvdXJjZS5pZCA9PT0gbm9kZS5pZCB8fCBsaW5rLnRhcmdldC5pZCA9PT0gbm9kZS5pZDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBHZXQgbGlua3Mgb2YgdGhlIHBhcmVudCBub2RlXHJcbiAgICAgICAgICAgIHZhciBwYXJlbnRMaW5rcyA9IHJlbGF0aW9uc2hpcHMuZmlsdGVyKGZ1bmN0aW9uIChsaW5rKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluay5zb3VyY2UgPT09IGN1cnJlbnROb2RlIHx8IGxpbmsudGFyZ2V0ID09PSBjdXJyZW50Tm9kZTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxpbmtzIHRvIHRoZSBuZXdseSBjcmVhdGVkIG5vZGVcclxuICAgICAgICAgICAgbGlua3MuZm9yRWFjaChmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudExpbmsgPSBwYXJlbnRMaW5rcy5maW5kKGZ1bmN0aW9uIChwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHAuaWQgPT09IGxpbmsuaWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50TGluaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5rLnNvdXJjZS5pZCA9PT0gbm9kZS5pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRMaW5rLnNvdXJjZSA9IG5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50TGluay50YXJnZXQgPSBub2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN1cnJlbnROb2RlLmNvbGxhcHNlZCA9IGZhbHNlO1xyXG4gICAgICAgIGN1cnJlbnROb2RlLnByZXZpb3VzID0gW107XHJcblxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29sbGFwc2VOb2RlKG5vZGUsIHJ1bGVzKSB7XHJcbiAgICAgICAgaWYgKCFydWxlc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbGlua3MgPSByZWxhdGlvbnNoaXBzLmZpbHRlcihmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICByZXR1cm4gbGluay5zb3VyY2UgPT09IG5vZGUgfHwgbGluay50YXJnZXQgPT09IG5vZGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciBwYXJlbnRMaW5rID0gbGlua3MuZmluZChmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICByZXR1cm4gcnVsZXMubGluay5pbmNsdWRlcyhsaW5rLnR5cGUudG9Mb3dlckNhc2UoKSkgJiYgbGluay50YXJnZXQubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCkgPT09IHJ1bGVzW25vZGUubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoIXBhcmVudExpbmspIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGFyZW50TGluay50YXJnZXQuY29sbGFwc2VkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGlua3Muc3BsaWNlKGxpbmtzLmluZGV4T2YocGFyZW50TGluayksIDEpO1xyXG5cclxuICAgICAgICBpZiAoIXBhcmVudExpbmsudGFyZ2V0LnByZXZpb3VzKSB7XHJcbiAgICAgICAgICAgIHBhcmVudExpbmsudGFyZ2V0LnByZXZpb3VzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJlbnRMaW5rLnRhcmdldC5wcmV2aW91cy5wdXNoKHtcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgbGluazogcGFyZW50TGlua1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsaW5rcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5rKSB7XHJcbiAgICAgICAgICAgIGxpbmsuY29sbGFwc2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKGxpbmsuc291cmNlID09PSBub2RlKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5rLnNvdXJjZSA9IHBhcmVudExpbmsudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgbGluay5zdGFydE5vZGUgPSBwYXJlbnRMaW5rLnRhcmdldC5pZDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxpbmsudGFyZ2V0ID0gcGFyZW50TGluay50YXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBsaW5rLmVuZE5vZGUgPSBwYXJlbnRMaW5rLnRhcmdldC5pZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZW1vdmVOb2RlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbmVvNGpEYXRhVG9EM0RhdGE6IG5lbzRqRGF0YVRvRDNEYXRhLFxyXG4gICAgICAgIHNpemU6IHNpemUsXHJcbiAgICAgICAgdXBkYXRlV2l0aEQzRGF0YTogdXBkYXRlV2l0aEQzRGF0YSxcclxuICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhOiB1cGRhdGVXaXRoTmVvNGpEYXRhLFxyXG4gICAgICAgIGFwcGVuZERhdGFUb05vZGU6IGFwcGVuZERhdGFUb05vZGUsXHJcbiAgICAgICAgcmVzZXRXaXRoTmVvNGpEYXRhOiByZXNldFdpdGhOZW80akRhdGEsXHJcbiAgICAgICAgcmVtb3ZlTm9kZTogcmVtb3ZlTm9kZSxcclxuICAgICAgICBjcmVhdGVWaWV3czogY3JlYXRlVmlld3MsXHJcbiAgICAgICAgaGlnaGxpZ2h0Tm9kZXM6IGhpZ2hsaWdodE5vZGVzLFxyXG4gICAgICAgIHVuSGlnaGxpZ2h0Tm9kZXM6IHVuSGlnaGxpZ2h0Tm9kZXMsXHJcbiAgICAgICAgb3JpZW50Rm9yY2VHcmFwaFZlcnRpY2FsOiBvcmllbnRGb3JjZUdyYXBoVmVydGljYWwsXHJcbiAgICAgICAgb3JpZW50Rm9yY2VHcmFwaEhvcml6b250YWw6IG9yaWVudEZvcmNlR3JhcGhIb3Jpem9udGFsLFxyXG4gICAgICAgIGdldEdyYXBoOiBnZXRHcmFwaCxcclxuICAgICAgICBjb2xsYXBzZU5vZGU6IGNvbGxhcHNlTm9kZSxcclxuICAgICAgICBleHBhbmROb2RlOiBleHBhbmROb2RlLFxyXG4gICAgICAgIHZlcnNpb246IHZlcnNpb25cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmVvNGpEMztcclxuIl19
