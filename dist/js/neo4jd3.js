(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
    var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
        classes2colors = {},
        justLoaded = false,
        numClasses = 0,
        options = {
            arrowSize: 4,
            colors: colors(),
            highlight: undefined,
            iconMap: fontAwesomeIcons(),
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

    function appendImageToNode(node) {
        return node.append('image')
            .attr('height', function (d) {
                return icon(d) ? '24px' : '30px';
            })
            .attr('x', function (d) {
                return icon(d) ? '5px' : '-15px';
            })
            .attr('xlink:href', function (d) {
                return image(d);
            })
            .attr('y', function (d) {
                return icon(d) ? '5px' : '-16px';
            })
            .attr('width', function (d) {
                return icon(d) ? '24px' : '30px';
            });
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
            .attr('id', function(d) {
                d.uuid = guid();
                return d.uuid;
            })
            .attr('class', function (d) {
                var highlight, i,
                    classes = 'node',
                    label = d.labels[0];

                if (icon(d)) {
                    classes += ' node-icon';
                }

                if (image(d)) {
                    classes += ' node-image';
                }

                if (options.highlight) {
                    for (i = 0; i < options.highlight.length; i++) {
                        highlight = options.highlight[i];

                        if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
                            classes += ' node-highlighted';
                            break;
                        }
                    }
                }

                return classes;
            })
            .on('click', function (d) {
                d.fx = d.fy = null;

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

        if (options.images) {
            appendImageToNode(n);
        }

        return n;
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

    function appendTextToNode(node) {
        return node.append('text')
            .text(function (d) {
                return d.properties.name;
            })
            .attr('fill', '#000000')
            .attr('font-size', function (d) {
                return icon(d) ? (options.nodeRadius + 'px') : '10px';
            })
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('y', function (d) {
                return icon(d) ? (parseInt(Math.round(options.nodeRadius * 0.32)) + 'px') : '4px';
            });
    }

    function appendRandomDataToNode(d, maxNodesToGenerate) {
        var data = randomD3Data(d, maxNodesToGenerate);
        updateWithNeo4jData(data);
    }

    function appendRelationship() {
        return relationship.enter()
            .append('g')
            .attr('id', function(d) {
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

    function fontAwesomeIcons() {
        return { 'glass': 'f000', 'music': 'f001', 'search': 'f002', 'envelope-o': 'f003', 'heart': 'f004', 'star': 'f005', 'star-o': 'f006', 'user': 'f007', 'film': 'f008', 'th-large': 'f009', 'th': 'f00a', 'th-list': 'f00b', 'check': 'f00c', 'remove,close,times': 'f00d', 'search-plus': 'f00e', 'search-minus': 'f010', 'power-off': 'f011', 'signal': 'f012', 'gear,cog': 'f013', 'trash-o': 'f014', 'home': 'f015', 'file-o': 'f016', 'clock-o': 'f017', 'road': 'f018', 'download': 'f019', 'arrow-circle-o-down': 'f01a', 'arrow-circle-o-up': 'f01b', 'inbox': 'f01c', 'play-circle-o': 'f01d', 'rotate-right,repeat': 'f01e', 'refresh': 'f021', 'list-alt': 'f022', 'lock': 'f023', 'flag': 'f024', 'headphones': 'f025', 'volume-off': 'f026', 'volume-down': 'f027', 'volume-up': 'f028', 'qrcode': 'f029', 'barcode': 'f02a', 'tag': 'f02b', 'tags': 'f02c', 'book': 'f02d', 'bookmark': 'f02e', 'print': 'f02f', 'camera': 'f030', 'font': 'f031', 'bold': 'f032', 'italic': 'f033', 'text-height': 'f034', 'text-width': 'f035', 'align-left': 'f036', 'align-center': 'f037', 'align-right': 'f038', 'align-justify': 'f039', 'list': 'f03a', 'dedent,outdent': 'f03b', 'indent': 'f03c', 'video-camera': 'f03d', 'photo,image,picture-o': 'f03e', 'pencil': 'f040', 'map-marker': 'f041', 'adjust': 'f042', 'tint': 'f043', 'edit,pencil-square-o': 'f044', 'share-square-o': 'f045', 'check-square-o': 'f046', 'arrows': 'f047', 'step-backward': 'f048', 'fast-backward': 'f049', 'backward': 'f04a', 'play': 'f04b', 'pause': 'f04c', 'stop': 'f04d', 'forward': 'f04e', 'fast-forward': 'f050', 'step-forward': 'f051', 'eject': 'f052', 'chevron-left': 'f053', 'chevron-right': 'f054', 'plus-circle': 'f055', 'minus-circle': 'f056', 'times-circle': 'f057', 'check-circle': 'f058', 'question-circle': 'f059', 'info-circle': 'f05a', 'crosshairs': 'f05b', 'times-circle-o': 'f05c', 'check-circle-o': 'f05d', 'ban': 'f05e', 'arrow-left': 'f060', 'arrow-right': 'f061', 'arrow-up': 'f062', 'arrow-down': 'f063', 'mail-forward,share': 'f064', 'expand': 'f065', 'compress': 'f066', 'plus': 'f067', 'minus': 'f068', 'asterisk': 'f069', 'exclamation-circle': 'f06a', 'gift': 'f06b', 'leaf': 'f06c', 'fire': 'f06d', 'eye': 'f06e', 'eye-slash': 'f070', 'warning,exclamation-triangle': 'f071', 'plane': 'f072', 'calendar': 'f073', 'random': 'f074', 'comment': 'f075', 'magnet': 'f076', 'chevron-up': 'f077', 'chevron-down': 'f078', 'retweet': 'f079', 'shopping-cart': 'f07a', 'folder': 'f07b', 'folder-open': 'f07c', 'arrows-v': 'f07d', 'arrows-h': 'f07e', 'bar-chart-o,bar-chart': 'f080', 'twitter-square': 'f081', 'facebook-square': 'f082', 'camera-retro': 'f083', 'key': 'f084', 'gears,cogs': 'f085', 'comments': 'f086', 'thumbs-o-up': 'f087', 'thumbs-o-down': 'f088', 'star-half': 'f089', 'heart-o': 'f08a', 'sign-out': 'f08b', 'linkedin-square': 'f08c', 'thumb-tack': 'f08d', 'external-link': 'f08e', 'sign-in': 'f090', 'trophy': 'f091', 'github-square': 'f092', 'upload': 'f093', 'lemon-o': 'f094', 'phone': 'f095', 'square-o': 'f096', 'bookmark-o': 'f097', 'phone-square': 'f098', 'twitter': 'f099', 'facebook-f,facebook': 'f09a', 'github': 'f09b', 'unlock': 'f09c', 'credit-card': 'f09d', 'feed,rss': 'f09e', 'hdd-o': 'f0a0', 'bullhorn': 'f0a1', 'bell': 'f0f3', 'certificate': 'f0a3', 'hand-o-right': 'f0a4', 'hand-o-left': 'f0a5', 'hand-o-up': 'f0a6', 'hand-o-down': 'f0a7', 'arrow-circle-left': 'f0a8', 'arrow-circle-right': 'f0a9', 'arrow-circle-up': 'f0aa', 'arrow-circle-down': 'f0ab', 'globe': 'f0ac', 'wrench': 'f0ad', 'tasks': 'f0ae', 'filter': 'f0b0', 'briefcase': 'f0b1', 'arrows-alt': 'f0b2', 'group,users': 'f0c0', 'chain,link': 'f0c1', 'cloud': 'f0c2', 'flask': 'f0c3', 'cut,scissors': 'f0c4', 'copy,files-o': 'f0c5', 'paperclip': 'f0c6', 'save,floppy-o': 'f0c7', 'square': 'f0c8', 'navicon,reorder,bars': 'f0c9', 'list-ul': 'f0ca', 'list-ol': 'f0cb', 'strikethrough': 'f0cc', 'underline': 'f0cd', 'table': 'f0ce', 'magic': 'f0d0', 'truck': 'f0d1', 'pinterest': 'f0d2', 'pinterest-square': 'f0d3', 'google-plus-square': 'f0d4', 'google-plus': 'f0d5', 'money': 'f0d6', 'caret-down': 'f0d7', 'caret-up': 'f0d8', 'caret-left': 'f0d9', 'caret-right': 'f0da', 'columns': 'f0db', 'unsorted,sort': 'f0dc', 'sort-down,sort-desc': 'f0dd', 'sort-up,sort-asc': 'f0de', 'envelope': 'f0e0', 'linkedin': 'f0e1', 'rotate-left,undo': 'f0e2', 'legal,gavel': 'f0e3', 'dashboard,tachometer': 'f0e4', 'comment-o': 'f0e5', 'comments-o': 'f0e6', 'flash,bolt': 'f0e7', 'sitemap': 'f0e8', 'umbrella': 'f0e9', 'paste,clipboard': 'f0ea', 'lightbulb-o': 'f0eb', 'exchange': 'f0ec', 'cloud-download': 'f0ed', 'cloud-upload': 'f0ee', 'user-md': 'f0f0', 'stethoscope': 'f0f1', 'suitcase': 'f0f2', 'bell-o': 'f0a2', 'coffee': 'f0f4', 'cutlery': 'f0f5', 'file-text-o': 'f0f6', 'building-o': 'f0f7', 'hospital-o': 'f0f8', 'ambulance': 'f0f9', 'medkit': 'f0fa', 'fighter-jet': 'f0fb', 'beer': 'f0fc', 'h-square': 'f0fd', 'plus-square': 'f0fe', 'angle-double-left': 'f100', 'angle-double-right': 'f101', 'angle-double-up': 'f102', 'angle-double-down': 'f103', 'angle-left': 'f104', 'angle-right': 'f105', 'angle-up': 'f106', 'angle-down': 'f107', 'desktop': 'f108', 'laptop': 'f109', 'tablet': 'f10a', 'mobile-phone,mobile': 'f10b', 'circle-o': 'f10c', 'quote-left': 'f10d', 'quote-right': 'f10e', 'spinner': 'f110', 'circle': 'f111', 'mail-reply,reply': 'f112', 'github-alt': 'f113', 'folder-o': 'f114', 'folder-open-o': 'f115', 'smile-o': 'f118', 'frown-o': 'f119', 'meh-o': 'f11a', 'gamepad': 'f11b', 'keyboard-o': 'f11c', 'flag-o': 'f11d', 'flag-checkered': 'f11e', 'terminal': 'f120', 'code': 'f121', 'mail-reply-all,reply-all': 'f122', 'star-half-empty,star-half-full,star-half-o': 'f123', 'location-arrow': 'f124', 'crop': 'f125', 'code-fork': 'f126', 'unlink,chain-broken': 'f127', 'question': 'f128', 'info': 'f129', 'exclamation': 'f12a', 'superscript': 'f12b', 'subscript': 'f12c', 'eraser': 'f12d', 'puzzle-piece': 'f12e', 'microphone': 'f130', 'microphone-slash': 'f131', 'shield': 'f132', 'calendar-o': 'f133', 'fire-extinguisher': 'f134', 'rocket': 'f135', 'maxcdn': 'f136', 'chevron-circle-left': 'f137', 'chevron-circle-right': 'f138', 'chevron-circle-up': 'f139', 'chevron-circle-down': 'f13a', 'html5': 'f13b', 'css3': 'f13c', 'anchor': 'f13d', 'unlock-alt': 'f13e', 'bullseye': 'f140', 'ellipsis-h': 'f141', 'ellipsis-v': 'f142', 'rss-square': 'f143', 'play-circle': 'f144', 'ticket': 'f145', 'minus-square': 'f146', 'minus-square-o': 'f147', 'level-up': 'f148', 'level-down': 'f149', 'check-square': 'f14a', 'pencil-square': 'f14b', 'external-link-square': 'f14c', 'share-square': 'f14d', 'compass': 'f14e', 'toggle-down,caret-square-o-down': 'f150', 'toggle-up,caret-square-o-up': 'f151', 'toggle-right,caret-square-o-right': 'f152', 'euro,eur': 'f153', 'gbp': 'f154', 'dollar,usd': 'f155', 'rupee,inr': 'f156', 'cny,rmb,yen,jpy': 'f157', 'ruble,rouble,rub': 'f158', 'won,krw': 'f159', 'bitcoin,btc': 'f15a', 'file': 'f15b', 'file-text': 'f15c', 'sort-alpha-asc': 'f15d', 'sort-alpha-desc': 'f15e', 'sort-amount-asc': 'f160', 'sort-amount-desc': 'f161', 'sort-numeric-asc': 'f162', 'sort-numeric-desc': 'f163', 'thumbs-up': 'f164', 'thumbs-down': 'f165', 'youtube-square': 'f166', 'youtube': 'f167', 'xing': 'f168', 'xing-square': 'f169', 'youtube-play': 'f16a', 'dropbox': 'f16b', 'stack-overflow': 'f16c', 'instagram': 'f16d', 'flickr': 'f16e', 'adn': 'f170', 'bitbucket': 'f171', 'bitbucket-square': 'f172', 'tumblr': 'f173', 'tumblr-square': 'f174', 'long-arrow-down': 'f175', 'long-arrow-up': 'f176', 'long-arrow-left': 'f177', 'long-arrow-right': 'f178', 'apple': 'f179', 'windows': 'f17a', 'android': 'f17b', 'linux': 'f17c', 'dribbble': 'f17d', 'skype': 'f17e', 'foursquare': 'f180', 'trello': 'f181', 'female': 'f182', 'male': 'f183', 'gittip,gratipay': 'f184', 'sun-o': 'f185', 'moon-o': 'f186', 'archive': 'f187', 'bug': 'f188', 'vk': 'f189', 'weibo': 'f18a', 'renren': 'f18b', 'pagelines': 'f18c', 'stack-exchange': 'f18d', 'arrow-circle-o-right': 'f18e', 'arrow-circle-o-left': 'f190', 'toggle-left,caret-square-o-left': 'f191', 'dot-circle-o': 'f192', 'wheelchair': 'f193', 'vimeo-square': 'f194', 'turkish-lira,try': 'f195', 'plus-square-o': 'f196', 'space-shuttle': 'f197', 'slack': 'f198', 'envelope-square': 'f199', 'wordpress': 'f19a', 'openid': 'f19b', 'institution,bank,university': 'f19c', 'mortar-board,graduation-cap': 'f19d', 'yahoo': 'f19e', 'google': 'f1a0', 'reddit': 'f1a1', 'reddit-square': 'f1a2', 'stumbleupon-circle': 'f1a3', 'stumbleupon': 'f1a4', 'delicious': 'f1a5', 'digg': 'f1a6', 'pied-piper-pp': 'f1a7', 'pied-piper-alt': 'f1a8', 'drupal': 'f1a9', 'joomla': 'f1aa', 'language': 'f1ab', 'fax': 'f1ac', 'building': 'f1ad', 'child': 'f1ae', 'paw': 'f1b0', 'spoon': 'f1b1', 'cube': 'f1b2', 'cubes': 'f1b3', 'behance': 'f1b4', 'behance-square': 'f1b5', 'steam': 'f1b6', 'steam-square': 'f1b7', 'recycle': 'f1b8', 'automobile,car': 'f1b9', 'cab,taxi': 'f1ba', 'tree': 'f1bb', 'spotify': 'f1bc', 'deviantart': 'f1bd', 'soundcloud': 'f1be', 'database': 'f1c0', 'file-pdf-o': 'f1c1', 'file-word-o': 'f1c2', 'file-excel-o': 'f1c3', 'file-powerpoint-o': 'f1c4', 'file-photo-o,file-picture-o,file-image-o': 'f1c5', 'file-zip-o,file-archive-o': 'f1c6', 'file-sound-o,file-audio-o': 'f1c7', 'file-movie-o,file-video-o': 'f1c8', 'file-code-o': 'f1c9', 'vine': 'f1ca', 'codepen': 'f1cb', 'jsfiddle': 'f1cc', 'life-bouy,life-buoy,life-saver,support,life-ring': 'f1cd', 'circle-o-notch': 'f1ce', 'ra,resistance,rebel': 'f1d0', 'ge,empire': 'f1d1', 'git-square': 'f1d2', 'git': 'f1d3', 'y-combinator-square,yc-square,hacker-news': 'f1d4', 'tencent-weibo': 'f1d5', 'qq': 'f1d6', 'wechat,weixin': 'f1d7', 'send,paper-plane': 'f1d8', 'send-o,paper-plane-o': 'f1d9', 'history': 'f1da', 'circle-thin': 'f1db', 'header': 'f1dc', 'paragraph': 'f1dd', 'sliders': 'f1de', 'share-alt': 'f1e0', 'share-alt-square': 'f1e1', 'bomb': 'f1e2', 'soccer-ball-o,futbol-o': 'f1e3', 'tty': 'f1e4', 'binoculars': 'f1e5', 'plug': 'f1e6', 'slideshare': 'f1e7', 'twitch': 'f1e8', 'yelp': 'f1e9', 'newspaper-o': 'f1ea', 'wifi': 'f1eb', 'calculator': 'f1ec', 'paypal': 'f1ed', 'google-wallet': 'f1ee', 'cc-visa': 'f1f0', 'cc-mastercard': 'f1f1', 'cc-discover': 'f1f2', 'cc-amex': 'f1f3', 'cc-paypal': 'f1f4', 'cc-stripe': 'f1f5', 'bell-slash': 'f1f6', 'bell-slash-o': 'f1f7', 'trash': 'f1f8', 'copyright': 'f1f9', 'at': 'f1fa', 'eyedropper': 'f1fb', 'paint-brush': 'f1fc', 'birthday-cake': 'f1fd', 'area-chart': 'f1fe', 'pie-chart': 'f200', 'line-chart': 'f201', 'lastfm': 'f202', 'lastfm-square': 'f203', 'toggle-off': 'f204', 'toggle-on': 'f205', 'bicycle': 'f206', 'bus': 'f207', 'ioxhost': 'f208', 'angellist': 'f209', 'cc': 'f20a', 'shekel,sheqel,ils': 'f20b', 'meanpath': 'f20c', 'buysellads': 'f20d', 'connectdevelop': 'f20e', 'dashcube': 'f210', 'forumbee': 'f211', 'leanpub': 'f212', 'sellsy': 'f213', 'shirtsinbulk': 'f214', 'simplybuilt': 'f215', 'skyatlas': 'f216', 'cart-plus': 'f217', 'cart-arrow-down': 'f218', 'diamond': 'f219', 'ship': 'f21a', 'user-secret': 'f21b', 'motorcycle': 'f21c', 'street-view': 'f21d', 'heartbeat': 'f21e', 'venus': 'f221', 'mars': 'f222', 'mercury': 'f223', 'intersex,transgender': 'f224', 'transgender-alt': 'f225', 'venus-double': 'f226', 'mars-double': 'f227', 'venus-mars': 'f228', 'mars-stroke': 'f229', 'mars-stroke-v': 'f22a', 'mars-stroke-h': 'f22b', 'neuter': 'f22c', 'genderless': 'f22d', 'facebook-official': 'f230', 'pinterest-p': 'f231', 'whatsapp': 'f232', 'server': 'f233', 'user-plus': 'f234', 'user-times': 'f235', 'hotel,bed': 'f236', 'viacoin': 'f237', 'train': 'f238', 'subway': 'f239', 'medium': 'f23a', 'yc,y-combinator': 'f23b', 'optin-monster': 'f23c', 'opencart': 'f23d', 'expeditedssl': 'f23e', 'battery-4,battery-full': 'f240', 'battery-3,battery-three-quarters': 'f241', 'battery-2,battery-half': 'f242', 'battery-1,battery-quarter': 'f243', 'battery-0,battery-empty': 'f244', 'mouse-pointer': 'f245', 'i-cursor': 'f246', 'object-group': 'f247', 'object-ungroup': 'f248', 'sticky-note': 'f249', 'sticky-note-o': 'f24a', 'cc-jcb': 'f24b', 'cc-diners-club': 'f24c', 'clone': 'f24d', 'balance-scale': 'f24e', 'hourglass-o': 'f250', 'hourglass-1,hourglass-start': 'f251', 'hourglass-2,hourglass-half': 'f252', 'hourglass-3,hourglass-end': 'f253', 'hourglass': 'f254', 'hand-grab-o,hand-rock-o': 'f255', 'hand-stop-o,hand-paper-o': 'f256', 'hand-scissors-o': 'f257', 'hand-lizard-o': 'f258', 'hand-spock-o': 'f259', 'hand-pointer-o': 'f25a', 'hand-peace-o': 'f25b', 'trademark': 'f25c', 'registered': 'f25d', 'creative-commons': 'f25e', 'gg': 'f260', 'gg-circle': 'f261', 'tripadvisor': 'f262', 'odnoklassniki': 'f263', 'odnoklassniki-square': 'f264', 'get-pocket': 'f265', 'wikipedia-w': 'f266', 'safari': 'f267', 'chrome': 'f268', 'firefox': 'f269', 'opera': 'f26a', 'internet-explorer': 'f26b', 'tv,television': 'f26c', 'contao': 'f26d', '500px': 'f26e', 'amazon': 'f270', 'calendar-plus-o': 'f271', 'calendar-minus-o': 'f272', 'calendar-times-o': 'f273', 'calendar-check-o': 'f274', 'industry': 'f275', 'map-pin': 'f276', 'map-signs': 'f277', 'map-o': 'f278', 'map': 'f279', 'commenting': 'f27a', 'commenting-o': 'f27b', 'houzz': 'f27c', 'vimeo': 'f27d', 'black-tie': 'f27e', 'fonticons': 'f280', 'reddit-alien': 'f281', 'edge': 'f282', 'credit-card-alt': 'f283', 'codiepie': 'f284', 'modx': 'f285', 'fort-awesome': 'f286', 'usb': 'f287', 'product-hunt': 'f288', 'mixcloud': 'f289', 'scribd': 'f28a', 'pause-circle': 'f28b', 'pause-circle-o': 'f28c', 'stop-circle': 'f28d', 'stop-circle-o': 'f28e', 'shopping-bag': 'f290', 'shopping-basket': 'f291', 'hashtag': 'f292', 'bluetooth': 'f293', 'bluetooth-b': 'f294', 'percent': 'f295', 'gitlab': 'f296', 'wpbeginner': 'f297', 'wpforms': 'f298', 'envira': 'f299', 'universal-access': 'f29a', 'wheelchair-alt': 'f29b', 'question-circle-o': 'f29c', 'blind': 'f29d', 'audio-description': 'f29e', 'volume-control-phone': 'f2a0', 'braille': 'f2a1', 'assistive-listening-systems': 'f2a2', 'asl-interpreting,american-sign-language-interpreting': 'f2a3', 'deafness,hard-of-hearing,deaf': 'f2a4', 'glide': 'f2a5', 'glide-g': 'f2a6', 'signing,sign-language': 'f2a7', 'low-vision': 'f2a8', 'viadeo': 'f2a9', 'viadeo-square': 'f2aa', 'snapchat': 'f2ab', 'snapchat-ghost': 'f2ac', 'snapchat-square': 'f2ad', 'pied-piper': 'f2ae', 'first-order': 'f2b0', 'yoast': 'f2b1', 'themeisle': 'f2b2', 'google-plus-circle,google-plus-official': 'f2b3', 'fa,font-awesome': 'f2b4' };
    }

    function icon(d) {
        var code;

        if (options.iconMap && options.showIcons && options.icons) {
            if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
                code = options.iconMap[options.icons[d.labels[0]]];
            } else if (options.iconMap[d.labels[0]]) {
                code = options.iconMap[d.labels[0]];
            } else if (options.icons[d.labels[0]]) {
                code = options.icons[d.labels[0]];
            }
        }

        return code;
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
        initIconMap();

        merge(options, _options);

        if (options.icons) {
            options.showIcons = true;
        }

        if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
        }

        initImageMap();

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
    }

    function initIconMap() {
        Object.keys(options.iconMap).forEach(function (key, index) {
            var keys = key.split(','),
                value = options.iconMap[key];

            keys.forEach(function (key) {
                options.iconMap[key] = value;
            });
        });
    }

    function initImageMap() {
        var key, keys, selector;

        for (key in options.images) {
            if (options.images.hasOwnProperty(key)) {
                keys = key.split('|');

                if (!options.imageMap[keys[0]]) {
                    options.imageMap[keys[0]] = [key];
                } else {
                    options.imageMap[keys[0]].push(key);
                }
            }
        }
    }

    function initSimulation() {
        var simulation = d3.forceSimulation()
            .force('collide', d3.forceCollide().radius(function (d) {
                return options.minCollision;
            }))
            .force('charge', d3.forceManyBody())
            .force('link', d3.forceLink().id(function (d) {
                return d.id;
            }))
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
    
    function appendDataToNodeOutward(sourceNode, newNodes, newRelationships) {
        var data = {
            nodes: [],
            relationships: []
        },
            node,
            relationship,
            s = size(),
            map = {};
        for (var i = 0; i < newNodes.length; i++) {
            node = {
                id: s.nodes + 1 + i,
                labels: newNodes[i].labels,
                properties: newNodes[i].properties,
                x: sourceNode.x,
                y: sourceNode.y
            };
            map[newNodes[i].id] = node.id;
            data.nodes[data.nodes.length] = node;
        }

        for (var j = 0; j < newRelationships.length; j++) {

            relationship = {
                id: s.relationships + 1 + j,
                type: newRelationships[j].type,
                startNode: sourceNode.id.toString(),
                endNode: map[newRelationships[j].endNode],
                properties: newRelationships[j].properties,
                source: sourceNode.id,
                target: map[newRelationships[j].endNode],
                linknum: s.relationships + 1 + j
            };

            data.relationships[data.relationships.length] = relationship;
        }
        updateWithD3Data(data);
    }

    
    function appendDataToNodeInward(sourceNode, newNodes, newRelationships) {
        var data = {
            nodes: [],
            relationships: []
        },
            node,
            relationship,
            s = size(),
            map = {};
        for (var i = 0; i < newNodes.length; i++) {
            node = {
                id: s.nodes + 1 + i,
                labels: newNodes[i].labels,
                properties: newNodes[i].properties,
                x: sourceNode.x,
                y: sourceNode.y
            };
            map[newNodes[i].id] = node.id;
            data.nodes[data.nodes.length] = node;
        }
        for (var j = 0; j < newRelationships.length; j++) {
            relationship = {
                id: s.relationships + 1 + j,
                type: newRelationships[j].type,
                startNode: map[newRelationships[j].startNode],
                endNode: sourceNode.id.toString(),
                properties: newRelationships[j].properties,
                source: map[newRelationships[j].startNode],
                target: sourceNode.id,
                linknum: s.relationships + 1 + j
            };

            data.relationships[data.relationships.length] = relationship;
        }
        updateWithD3Data(data);
    }

    function randomD3Data(d, maxNodesToGenerate) {
        var data = {
            nodes: [],
            relationships: []
        },
            i,
            label,
            node,
            numNodes = (maxNodesToGenerate * Math.random() << 0) + 1,
            relationship,
            s = size();
        for (i = 0; i < numNodes; i++) {
            label = randomLabel();

            node = {
                id: s.nodes + 1 + i,
                labels: [label],
                properties: {
                    random: label
                },
                x: d.x,
                y: d.y
            };

            data.nodes[data.nodes.length] = node;

            relationship = {
                id: s.relationships + 1 + i,
                type: label.toUpperCase(),
                startNode: d.id,
                endNode: s.nodes + 1 + i,
                properties: {
                    from: Date.now()
                },
                source: d.id,
                target: s.nodes + 1 + i,
                linknum: s.relationships + 1 + i
            };
            data.relationships[data.relationships.length] = relationship;
        }
        return data;
    }

    function randomLabel() {
        var icons = Object.keys(options.iconMap);
        return icons[icons.length * Math.random() << 0];
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
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
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

    function updateNodes(n) {
        Array.prototype.push.apply(nodes, n);

        node = svgNodes.selectAll('.node')
            .data(nodes, function (d) { return d.id; });
        var nodeEnter = appendNodeToGraph();
        node = nodeEnter.merge(node);
    }

    function updateNodesAndRelationships(n, r) {
        updateRelationships(r);
        updateNodes(n);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateRelationships(r) {
        Array.prototype.push.apply(relationships, r);

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
        relationships = relationships.filter(function(relationship) {
            if(relationship.source === sourceNode || relationship.target === sourceNode) {
                d3.select("#" + relationship.uuid).remove();
                return false;
            } else {
                return true;
            }
        });
        nodes = nodes.filter(function(node) {
            return node !== sourceNode;
        });

        d3.select("#" + sourceNode.uuid).remove();
        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
        
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
        var circles = d3.select('svg').selectAll('circle.views').data(keys);
        var r=20;
        circles.enter().append('rect').classed('views', true)
        .attr('x', r)
        .attr('y', function(node) {
            return (keys.indexOf(node)+1)*2.2*r + 27;
        })
        .attr('rx', r/3)
        .attr('rx', r/3)
        .attr('width', r*4)
        .attr('height', r)
        .attr('fill', function(node) {
            return colors()[keys.indexOf(node)+1];
        })
        .attr('stroke', function(node) {
            return "#000000";
        })
        .attr('stroke-width', function(node) {
            return "0.5px";
        })
        .attr("cursor", "pointer")
        .on('click', function(n) {
            if (typeof options.onViewsClickHandler === 'function') {
                options.onViewsClickHandler(n);
            }
        });
        
        var text = d3.select('svg').selectAll('text.views').data(keys);
        text.enter().append('text').classed('views',true)
        .attr('text-anchor', 'left')
        .attr('font-weight', 'bold')
        .attr('stroke-width' , '0')
        .attr('stroke-color' , 'white')
        .attr('fill' , '#696969')
        .attr('x' , 2*r)
        .attr('font-size' , "10px")
        .attr("cursor", "pointer")
        .text(function(node) {
            return node;
        }).attr('y', function(node) {
            return (keys.indexOf(node)+1)*2.2*r+40;
        })
        .on('click', function(n) {
            if (typeof options.onViewsClickHandler === 'function') {
                options.onViewsClickHandler(n);
            }
        });
        return circles.exit().remove();
      }

    return {
        appendRandomDataToNode: appendRandomDataToNode,
        neo4jDataToD3Data: neo4jDataToD3Data,
        randomD3Data: randomD3Data,
        size: size,
        updateWithD3Data: updateWithD3Data,
        updateWithNeo4jData: updateWithNeo4jData,
        appendDataToNodeOutward: appendDataToNodeOutward,
        appendDataToNodeInward: appendDataToNodeInward,
        resetWithNeo4jData: resetWithNeo4jData,
        removeNode: removeNode,
        createViews: createViews,
        version: version
    };
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBuZW80amQzID0gcmVxdWlyZSgnLi9zY3JpcHRzL25lbzRqZDMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZW80amQzO1xuIiwiLyogZ2xvYmFsIGQzLCBkb2N1bWVudCAqL1xyXG4vKiBqc2hpbnQgbGF0ZWRlZjpub2Z1bmMgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gTmVvNGpEMyhfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICB2YXIgY29udGFpbmVyLCBncmFwaCwgaW5mbywgbm9kZSwgbm9kZXMsIHJlbGF0aW9uc2hpcCwgcmVsYXRpb25zaGlwT3V0bGluZSwgcmVsYXRpb25zaGlwT3ZlcmxheSwgcmVsYXRpb25zaGlwVGV4dCwgcmVsYXRpb25zaGlwcywgc2VsZWN0b3IsIHNpbXVsYXRpb24sIHN2Zywgc3ZnTm9kZXMsIHN2Z1JlbGF0aW9uc2hpcHMsIHN2Z1NjYWxlLCBzdmdUcmFuc2xhdGUsXHJcbiAgICAgICAgY2xhc3NlczJjb2xvcnMgPSB7fSxcclxuICAgICAgICBqdXN0TG9hZGVkID0gZmFsc2UsXHJcbiAgICAgICAgbnVtQ2xhc3NlcyA9IDAsXHJcbiAgICAgICAgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgYXJyb3dTaXplOiA0LFxyXG4gICAgICAgICAgICBjb2xvcnM6IGNvbG9ycygpLFxyXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaWNvbk1hcDogZm9udEF3ZXNvbWVJY29ucygpLFxyXG4gICAgICAgICAgICBpY29uczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbWFnZU1hcDoge30sXHJcbiAgICAgICAgICAgIGltYWdlczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbmZvUGFuZWw6IHRydWUsXHJcbiAgICAgICAgICAgIG1pbkNvbGxpc2lvbjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBuZW80akRhdGE6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVPdXRsaW5lRmlsbENvbG9yOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVSYWRpdXM6IDI1LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBDb2xvcjogJyNhNWFiYjYnLFxyXG4gICAgICAgICAgICB6b29tRml0OiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgVkVSU0lPTiA9ICcwLjAuMSc7XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kR3JhcGgoY29udGFpbmVyKSB7XHJcbiAgICAgICAgc3ZnID0gY29udGFpbmVyLmFwcGVuZCgnc3ZnJylcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnbmVvNGpkMy1ncmFwaCcpXHJcbiAgICAgICAgICAgIC5jYWxsKGQzLnpvb20oKS5vbignem9vbScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IGQzLmV2ZW50LnRyYW5zZm9ybS5rLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9IFtkMy5ldmVudC50cmFuc2Zvcm0ueCwgZDMuZXZlbnQudHJhbnNmb3JtLnldO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdmdUcmFuc2xhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGVbMF0gKz0gc3ZnVHJhbnNsYXRlWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZVsxXSArPSBzdmdUcmFuc2xhdGVbMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN2Z1NjYWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRyYW5zbGF0ZVswXSArICcsICcgKyB0cmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc2NhbGUgKyAnKScpO1xyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLm9uKCdkYmxjbGljay56b29tJywgbnVsbClcclxuICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICcxMDAlJyk7XHJcblxyXG4gICAgICAgIHN2Z1JlbGF0aW9uc2hpcHMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JlbGF0aW9uc2hpcHMnKTtcclxuXHJcbiAgICAgICAgc3ZnTm9kZXMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW1hZ2VUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnaW1hZ2UnKVxyXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzI0cHgnIDogJzMwcHgnO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cigneCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICc1cHgnIDogJy0xNXB4JztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGltYWdlKGQpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cigneScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICc1cHgnIDogJy0xNnB4JztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzI0cHgnIDogJzMwcHgnO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lci5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWluZm8nKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGlzTm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGVsZW0gPSBpbmZvLmFwcGVuZCgnYScpO1xyXG5cclxuICAgICAgICBlbGVtLmF0dHIoJ2hyZWYnLCAnIycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGNscylcclxuICAgICAgICAgICAgLmh0bWwoJzxzdHJvbmc+JyArIHByb3BlcnR5ICsgJzwvc3Ryb25nPicgKyAodmFsdWUgPyAoJzogJyArIHZhbHVlKSA6ICcnKSk7XHJcblxyXG4gICAgICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICAgICAgZWxlbS5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiAoaXNOb2RlID8gY2xhc3MyY29sb3IocHJvcGVydHkpIDogZGVmYXVsdENvbG9yKCkpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdib3JkZXItY29sb3InLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiAoaXNOb2RlID8gY2xhc3MyZGFya2VuQ29sb3IocHJvcGVydHkpIDogZGVmYXVsdERhcmtlbkNvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnY29sb3InLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiAnI2ZmZic7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRDbGFzcyhjbHMsIG5vZGUpIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIHRydWUsIG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50UHJvcGVydHkoY2xzLCBwcm9wZXJ0eSwgdmFsdWUpIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKGNscywgcmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBmYWxzZSwgcmVsYXRpb25zaGlwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRDb250ZXh0TWVudShub2RlLCBpbmRleCkge1xyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgY29udGFpbmVyIGZvciB0aGUgY29udGV4dCBtZW51XHJcbiAgICAgICAgZDMuc2VsZWN0QWxsKCcuY29udGV4dC1tZW51JykuZGF0YShbMV0pXHJcbiAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdjb250ZXh0LW1lbnUnKTtcclxuXHJcbiAgICAgICAgLy8gSGlkZSB0aGUgY29udGV4dC1tZW51IGlmIGl0IGdvZXMgb3V0IG9mIGZvY3VzIFxyXG4gICAgICAgIGQzLnNlbGVjdCgnYm9keScpLm9uKCdjbGljay5jb250ZXh0LW1lbnUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGQzLnNlbGVjdCgnLmNvbnRleHQtbWVudScpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQXBwZW5kIGRhdGEgdG8gdGhlIGNvbnRleHQgbWVudVxyXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnLmNvbnRleHQtbWVudScpXHJcbiAgICAgICAgICAgIC5odG1sKCcnKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCd1bCcpXHJcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoJ2xpJylcclxuICAgICAgICAgICAgLmRhdGEob3B0aW9ucy5jb250ZXh0TWVudSlcclxuICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgLmFwcGVuZCgnbGknKVxyXG4gICAgICAgICAgICAub24oJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5oYW5kbGVyKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KCcuY29udGV4dC1tZW51Jykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdpJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLmljb247XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIgXCIgKyBkLnRleHQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTaG93IHRoZSBjb250ZXh0IG1lbnVcclxuICAgICAgICBkMy5zZWxlY3QoJy5jb250ZXh0LW1lbnUnKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ2xlZnQnLCAoZDMuZXZlbnQucGFnZVggLSAyKSArICdweCcpXHJcbiAgICAgICAgICAgIC5zdHlsZSgndG9wJywgKGQzLmV2ZW50LnBhZ2VZIC0gMikgKyAncHgnKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnYmxvY2snKTtcclxuICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLm9uKCdjb250ZXh0bWVudScsIGFwcGVuZENvbnRleHRNZW51KVxyXG4gICAgICAgICAgICAuYXR0cignaWQnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICBkLnV1aWQgPSBndWlkKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC51dWlkO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGhpZ2hsaWdodCwgaSxcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzID0gJ25vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsID0gZC5sYWJlbHNbMF07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGljb24oZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1pY29uJztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW1hZ2UoZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1pbWFnZSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuaGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG9wdGlvbnMuaGlnaGxpZ2h0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZ2hsaWdodCA9IG9wdGlvbnMuaGlnaGxpZ2h0W2ldO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQubGFiZWxzWzBdID09PSBoaWdobGlnaHQuY2xhc3MgJiYgZC5wcm9wZXJ0aWVzW2hpZ2hsaWdodC5wcm9wZXJ0eV0gPT09IGhpZ2hsaWdodC52YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaGlnaGxpZ2h0ZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsYXNzZXM7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgZC5meCA9IGQuZnkgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEb3VibGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIoZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uIChkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUoZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5jYWxsKGQzLmRyYWcoKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdzdGFydCcsIGRyYWdTdGFydGVkKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdkcmFnJywgZHJhZ2dlZClcclxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgZHJhZ0VuZGVkKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kTm9kZVRvR3JhcGgoKSB7XHJcbiAgICAgICAgdmFyIG4gPSBhcHBlbmROb2RlKCk7XHJcblxyXG4gICAgICAgIGFwcGVuZFJpbmdUb05vZGUobik7XHJcbiAgICAgICAgYXBwZW5kT3V0bGluZVRvTm9kZShuKTtcclxuICAgICAgICBhcHBlbmRUZXh0VG9Ob2RlKG4pO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW1hZ2VUb05vZGUobik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdXRsaW5lVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdvdXRsaW5lJylcclxuICAgICAgICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMpXHJcbiAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiBjbGFzczJjb2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiBjbGFzczJkYXJrZW5Db2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSaW5nVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyaW5nJylcclxuICAgICAgICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMgKiAxLjE2KVxyXG4gICAgICAgICAgICAuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZyhkKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kVGV4dFRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb3BlcnRpZXMubmFtZTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzAwMDAwMCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAob3B0aW9ucy5ub2RlUmFkaXVzICsgJ3B4JykgOiAnMTBweCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcclxuICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gKHBhcnNlSW50KE1hdGgucm91bmQob3B0aW9ucy5ub2RlUmFkaXVzICogMC4zMikpICsgJ3B4JykgOiAnNHB4JztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmFuZG9tRGF0YVRvTm9kZShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHJhbmRvbUQzRGF0YShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpO1xyXG4gICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwKCkge1xyXG4gICAgICAgIHJldHVybiByZWxhdGlvbnNoaXAuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgZC51dWlkID0gZ3VpZCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQudXVpZDtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgIC5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2sgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjYTVhYmI2JylcclxuICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZScsICdub25lJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3ZlcmxheVRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgICAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnb3ZlcmxheScpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFRleHRUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RleHQnKVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjMDAwMDAwJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsICc4cHgnKVxyXG4gICAgICAgICAgICAuYXR0cigncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwVG9HcmFwaCgpIHtcclxuICAgICAgICB2YXIgcmVsYXRpb25zaGlwID0gYXBwZW5kUmVsYXRpb25zaGlwKCksXHJcbiAgICAgICAgICAgIHRleHQgPSBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKSxcclxuICAgICAgICAgICAgb3V0bGluZSA9IGFwcGVuZE91dGxpbmVUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApLFxyXG4gICAgICAgICAgICBvdmVybGF5ID0gYXBwZW5kT3ZlcmxheVRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG91dGxpbmU6IG91dGxpbmUsXHJcbiAgICAgICAgICAgIG92ZXJsYXk6IG92ZXJsYXksXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGFzczJjb2xvcihjbHMpIHtcclxuICAgICAgICB2YXIgY29sb3IgPSBjbGFzc2VzMmNvbG9yc1tjbHNdO1xyXG5cclxuICAgICAgICBpZiAoIWNvbG9yKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgY29sb3IgPSBvcHRpb25zLmNvbG9yc1tNYXRoLm1pbihudW1DbGFzc2VzLCBvcHRpb25zLmNvbG9ycy5sZW5ndGggLSAxKV07XHJcbiAgICAgICAgICAgIGNvbG9yID0gb3B0aW9ucy5jb2xvcnNbbnVtQ2xhc3NlcyAlIG9wdGlvbnMuY29sb3JzLmxlbmd0aF07XHJcbiAgICAgICAgICAgIGNsYXNzZXMyY29sb3JzW2Nsc10gPSBjb2xvcjtcclxuICAgICAgICAgICAgbnVtQ2xhc3NlcysrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsYXNzMmRhcmtlbkNvbG9yKGNscykge1xyXG4gICAgICAgIHJldHVybiBkMy5yZ2IoY2xhc3MyY29sb3IoY2xzKSkuZGFya2VyKDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsZWFySW5mbygpIHtcclxuICAgICAgICBpbmZvLmh0bWwoJycpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbG9ycygpIHtcclxuICAgICAgICAvLyBkMy5zY2hlbWVDYXRlZ29yeTEwLFxyXG4gICAgICAgIC8vIGQzLnNjaGVtZUNhdGVnb3J5MjAsXHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgJyM2OGJkZjYnLCAvLyBsaWdodCBibHVlXHJcbiAgICAgICAgICAgICcjNmRjZTllJywgLy8gZ3JlZW4gIzFcclxuICAgICAgICAgICAgJyNmYWFmYzInLCAvLyBsaWdodCBwaW5rXHJcbiAgICAgICAgICAgICcjZjJiYWY2JywgLy8gcHVycGxlXHJcbiAgICAgICAgICAgICcjZmY5MjhjJywgLy8gbGlnaHQgcmVkXHJcbiAgICAgICAgICAgICcjZmNlYTdlJywgLy8gbGlnaHQgeWVsbG93XHJcbiAgICAgICAgICAgICcjZmZjNzY2JywgLy8gbGlnaHQgb3JhbmdlXHJcbiAgICAgICAgICAgICcjNDA1ZjllJywgLy8gbmF2eSBibHVlXHJcbiAgICAgICAgICAgICcjYTVhYmI2JywgLy8gZGFyayBncmF5XHJcbiAgICAgICAgICAgICcjNzhjZWNiJywgLy8gZ3JlZW4gIzIsXHJcbiAgICAgICAgICAgICcjYjg4Y2JiJywgLy8gZGFyayBwdXJwbGVcclxuICAgICAgICAgICAgJyNjZWQyZDknLCAvLyBsaWdodCBncmF5XHJcbiAgICAgICAgICAgICcjZTg0NjQ2JywgLy8gZGFyayByZWRcclxuICAgICAgICAgICAgJyNmYTVmODYnLCAvLyBkYXJrIHBpbmtcclxuICAgICAgICAgICAgJyNmZmFiMWEnLCAvLyBkYXJrIG9yYW5nZVxyXG4gICAgICAgICAgICAnI2ZjZGExOScsIC8vIGRhcmsgeWVsbG93XHJcbiAgICAgICAgICAgICcjNzk3YjgwJywgLy8gYmxhY2tcclxuICAgICAgICAgICAgJyNjOWQ5NmYnLCAvLyBwaXN0YWNjaGlvXHJcbiAgICAgICAgICAgICcjNDc5OTFmJywgLy8gZ3JlZW4gIzNcclxuICAgICAgICAgICAgJyM3MGVkZWUnLCAvLyB0dXJxdW9pc2VcclxuICAgICAgICAgICAgJyNmZjc1ZWEnICAvLyBwaW5rXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb250YWlucyhhcnJheSwgaWQpIHtcclxuICAgICAgICB2YXIgZmlsdGVyID0gYXJyYXkuZmlsdGVyKGZ1bmN0aW9uIChlbGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtLmlkID09PSBpZDtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZpbHRlci5sZW5ndGggPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlZmF1bHRDb2xvcigpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5yZWxhdGlvbnNoaXBDb2xvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0RGFya2VuQ29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIGQzLnJnYihvcHRpb25zLmNvbG9yc1tvcHRpb25zLmNvbG9ycy5sZW5ndGggLSAxXSkuZGFya2VyKDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdFbmRlZChkKSB7XHJcbiAgICAgICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEcmFnRW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ0VuZChkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhZ2dlZChkKSB7XHJcbiAgICAgICAgc3RpY2tOb2RlKGQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdTdGFydGVkKGQpIHtcclxuICAgICAgICBpZiAoIWQzLmV2ZW50LmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuMykucmVzdGFydCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZC5meCA9IGQueDtcclxuICAgICAgICBkLmZ5ID0gZC55O1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0KGQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBleHRlbmQob2JqMSwgb2JqMikge1xyXG4gICAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgICAgbWVyZ2Uob2JqLCBvYmoxKTtcclxuICAgICAgICBtZXJnZShvYmosIG9iajIpO1xyXG5cclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZvbnRBd2Vzb21lSWNvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgJ2dsYXNzJzogJ2YwMDAnLCAnbXVzaWMnOiAnZjAwMScsICdzZWFyY2gnOiAnZjAwMicsICdlbnZlbG9wZS1vJzogJ2YwMDMnLCAnaGVhcnQnOiAnZjAwNCcsICdzdGFyJzogJ2YwMDUnLCAnc3Rhci1vJzogJ2YwMDYnLCAndXNlcic6ICdmMDA3JywgJ2ZpbG0nOiAnZjAwOCcsICd0aC1sYXJnZSc6ICdmMDA5JywgJ3RoJzogJ2YwMGEnLCAndGgtbGlzdCc6ICdmMDBiJywgJ2NoZWNrJzogJ2YwMGMnLCAncmVtb3ZlLGNsb3NlLHRpbWVzJzogJ2YwMGQnLCAnc2VhcmNoLXBsdXMnOiAnZjAwZScsICdzZWFyY2gtbWludXMnOiAnZjAxMCcsICdwb3dlci1vZmYnOiAnZjAxMScsICdzaWduYWwnOiAnZjAxMicsICdnZWFyLGNvZyc6ICdmMDEzJywgJ3RyYXNoLW8nOiAnZjAxNCcsICdob21lJzogJ2YwMTUnLCAnZmlsZS1vJzogJ2YwMTYnLCAnY2xvY2stbyc6ICdmMDE3JywgJ3JvYWQnOiAnZjAxOCcsICdkb3dubG9hZCc6ICdmMDE5JywgJ2Fycm93LWNpcmNsZS1vLWRvd24nOiAnZjAxYScsICdhcnJvdy1jaXJjbGUtby11cCc6ICdmMDFiJywgJ2luYm94JzogJ2YwMWMnLCAncGxheS1jaXJjbGUtbyc6ICdmMDFkJywgJ3JvdGF0ZS1yaWdodCxyZXBlYXQnOiAnZjAxZScsICdyZWZyZXNoJzogJ2YwMjEnLCAnbGlzdC1hbHQnOiAnZjAyMicsICdsb2NrJzogJ2YwMjMnLCAnZmxhZyc6ICdmMDI0JywgJ2hlYWRwaG9uZXMnOiAnZjAyNScsICd2b2x1bWUtb2ZmJzogJ2YwMjYnLCAndm9sdW1lLWRvd24nOiAnZjAyNycsICd2b2x1bWUtdXAnOiAnZjAyOCcsICdxcmNvZGUnOiAnZjAyOScsICdiYXJjb2RlJzogJ2YwMmEnLCAndGFnJzogJ2YwMmInLCAndGFncyc6ICdmMDJjJywgJ2Jvb2snOiAnZjAyZCcsICdib29rbWFyayc6ICdmMDJlJywgJ3ByaW50JzogJ2YwMmYnLCAnY2FtZXJhJzogJ2YwMzAnLCAnZm9udCc6ICdmMDMxJywgJ2JvbGQnOiAnZjAzMicsICdpdGFsaWMnOiAnZjAzMycsICd0ZXh0LWhlaWdodCc6ICdmMDM0JywgJ3RleHQtd2lkdGgnOiAnZjAzNScsICdhbGlnbi1sZWZ0JzogJ2YwMzYnLCAnYWxpZ24tY2VudGVyJzogJ2YwMzcnLCAnYWxpZ24tcmlnaHQnOiAnZjAzOCcsICdhbGlnbi1qdXN0aWZ5JzogJ2YwMzknLCAnbGlzdCc6ICdmMDNhJywgJ2RlZGVudCxvdXRkZW50JzogJ2YwM2InLCAnaW5kZW50JzogJ2YwM2MnLCAndmlkZW8tY2FtZXJhJzogJ2YwM2QnLCAncGhvdG8saW1hZ2UscGljdHVyZS1vJzogJ2YwM2UnLCAncGVuY2lsJzogJ2YwNDAnLCAnbWFwLW1hcmtlcic6ICdmMDQxJywgJ2FkanVzdCc6ICdmMDQyJywgJ3RpbnQnOiAnZjA0MycsICdlZGl0LHBlbmNpbC1zcXVhcmUtbyc6ICdmMDQ0JywgJ3NoYXJlLXNxdWFyZS1vJzogJ2YwNDUnLCAnY2hlY2stc3F1YXJlLW8nOiAnZjA0NicsICdhcnJvd3MnOiAnZjA0NycsICdzdGVwLWJhY2t3YXJkJzogJ2YwNDgnLCAnZmFzdC1iYWNrd2FyZCc6ICdmMDQ5JywgJ2JhY2t3YXJkJzogJ2YwNGEnLCAncGxheSc6ICdmMDRiJywgJ3BhdXNlJzogJ2YwNGMnLCAnc3RvcCc6ICdmMDRkJywgJ2ZvcndhcmQnOiAnZjA0ZScsICdmYXN0LWZvcndhcmQnOiAnZjA1MCcsICdzdGVwLWZvcndhcmQnOiAnZjA1MScsICdlamVjdCc6ICdmMDUyJywgJ2NoZXZyb24tbGVmdCc6ICdmMDUzJywgJ2NoZXZyb24tcmlnaHQnOiAnZjA1NCcsICdwbHVzLWNpcmNsZSc6ICdmMDU1JywgJ21pbnVzLWNpcmNsZSc6ICdmMDU2JywgJ3RpbWVzLWNpcmNsZSc6ICdmMDU3JywgJ2NoZWNrLWNpcmNsZSc6ICdmMDU4JywgJ3F1ZXN0aW9uLWNpcmNsZSc6ICdmMDU5JywgJ2luZm8tY2lyY2xlJzogJ2YwNWEnLCAnY3Jvc3NoYWlycyc6ICdmMDViJywgJ3RpbWVzLWNpcmNsZS1vJzogJ2YwNWMnLCAnY2hlY2stY2lyY2xlLW8nOiAnZjA1ZCcsICdiYW4nOiAnZjA1ZScsICdhcnJvdy1sZWZ0JzogJ2YwNjAnLCAnYXJyb3ctcmlnaHQnOiAnZjA2MScsICdhcnJvdy11cCc6ICdmMDYyJywgJ2Fycm93LWRvd24nOiAnZjA2MycsICdtYWlsLWZvcndhcmQsc2hhcmUnOiAnZjA2NCcsICdleHBhbmQnOiAnZjA2NScsICdjb21wcmVzcyc6ICdmMDY2JywgJ3BsdXMnOiAnZjA2NycsICdtaW51cyc6ICdmMDY4JywgJ2FzdGVyaXNrJzogJ2YwNjknLCAnZXhjbGFtYXRpb24tY2lyY2xlJzogJ2YwNmEnLCAnZ2lmdCc6ICdmMDZiJywgJ2xlYWYnOiAnZjA2YycsICdmaXJlJzogJ2YwNmQnLCAnZXllJzogJ2YwNmUnLCAnZXllLXNsYXNoJzogJ2YwNzAnLCAnd2FybmluZyxleGNsYW1hdGlvbi10cmlhbmdsZSc6ICdmMDcxJywgJ3BsYW5lJzogJ2YwNzInLCAnY2FsZW5kYXInOiAnZjA3MycsICdyYW5kb20nOiAnZjA3NCcsICdjb21tZW50JzogJ2YwNzUnLCAnbWFnbmV0JzogJ2YwNzYnLCAnY2hldnJvbi11cCc6ICdmMDc3JywgJ2NoZXZyb24tZG93bic6ICdmMDc4JywgJ3JldHdlZXQnOiAnZjA3OScsICdzaG9wcGluZy1jYXJ0JzogJ2YwN2EnLCAnZm9sZGVyJzogJ2YwN2InLCAnZm9sZGVyLW9wZW4nOiAnZjA3YycsICdhcnJvd3Mtdic6ICdmMDdkJywgJ2Fycm93cy1oJzogJ2YwN2UnLCAnYmFyLWNoYXJ0LW8sYmFyLWNoYXJ0JzogJ2YwODAnLCAndHdpdHRlci1zcXVhcmUnOiAnZjA4MScsICdmYWNlYm9vay1zcXVhcmUnOiAnZjA4MicsICdjYW1lcmEtcmV0cm8nOiAnZjA4MycsICdrZXknOiAnZjA4NCcsICdnZWFycyxjb2dzJzogJ2YwODUnLCAnY29tbWVudHMnOiAnZjA4NicsICd0aHVtYnMtby11cCc6ICdmMDg3JywgJ3RodW1icy1vLWRvd24nOiAnZjA4OCcsICdzdGFyLWhhbGYnOiAnZjA4OScsICdoZWFydC1vJzogJ2YwOGEnLCAnc2lnbi1vdXQnOiAnZjA4YicsICdsaW5rZWRpbi1zcXVhcmUnOiAnZjA4YycsICd0aHVtYi10YWNrJzogJ2YwOGQnLCAnZXh0ZXJuYWwtbGluayc6ICdmMDhlJywgJ3NpZ24taW4nOiAnZjA5MCcsICd0cm9waHknOiAnZjA5MScsICdnaXRodWItc3F1YXJlJzogJ2YwOTInLCAndXBsb2FkJzogJ2YwOTMnLCAnbGVtb24tbyc6ICdmMDk0JywgJ3Bob25lJzogJ2YwOTUnLCAnc3F1YXJlLW8nOiAnZjA5NicsICdib29rbWFyay1vJzogJ2YwOTcnLCAncGhvbmUtc3F1YXJlJzogJ2YwOTgnLCAndHdpdHRlcic6ICdmMDk5JywgJ2ZhY2Vib29rLWYsZmFjZWJvb2snOiAnZjA5YScsICdnaXRodWInOiAnZjA5YicsICd1bmxvY2snOiAnZjA5YycsICdjcmVkaXQtY2FyZCc6ICdmMDlkJywgJ2ZlZWQscnNzJzogJ2YwOWUnLCAnaGRkLW8nOiAnZjBhMCcsICdidWxsaG9ybic6ICdmMGExJywgJ2JlbGwnOiAnZjBmMycsICdjZXJ0aWZpY2F0ZSc6ICdmMGEzJywgJ2hhbmQtby1yaWdodCc6ICdmMGE0JywgJ2hhbmQtby1sZWZ0JzogJ2YwYTUnLCAnaGFuZC1vLXVwJzogJ2YwYTYnLCAnaGFuZC1vLWRvd24nOiAnZjBhNycsICdhcnJvdy1jaXJjbGUtbGVmdCc6ICdmMGE4JywgJ2Fycm93LWNpcmNsZS1yaWdodCc6ICdmMGE5JywgJ2Fycm93LWNpcmNsZS11cCc6ICdmMGFhJywgJ2Fycm93LWNpcmNsZS1kb3duJzogJ2YwYWInLCAnZ2xvYmUnOiAnZjBhYycsICd3cmVuY2gnOiAnZjBhZCcsICd0YXNrcyc6ICdmMGFlJywgJ2ZpbHRlcic6ICdmMGIwJywgJ2JyaWVmY2FzZSc6ICdmMGIxJywgJ2Fycm93cy1hbHQnOiAnZjBiMicsICdncm91cCx1c2Vycyc6ICdmMGMwJywgJ2NoYWluLGxpbmsnOiAnZjBjMScsICdjbG91ZCc6ICdmMGMyJywgJ2ZsYXNrJzogJ2YwYzMnLCAnY3V0LHNjaXNzb3JzJzogJ2YwYzQnLCAnY29weSxmaWxlcy1vJzogJ2YwYzUnLCAncGFwZXJjbGlwJzogJ2YwYzYnLCAnc2F2ZSxmbG9wcHktbyc6ICdmMGM3JywgJ3NxdWFyZSc6ICdmMGM4JywgJ25hdmljb24scmVvcmRlcixiYXJzJzogJ2YwYzknLCAnbGlzdC11bCc6ICdmMGNhJywgJ2xpc3Qtb2wnOiAnZjBjYicsICdzdHJpa2V0aHJvdWdoJzogJ2YwY2MnLCAndW5kZXJsaW5lJzogJ2YwY2QnLCAndGFibGUnOiAnZjBjZScsICdtYWdpYyc6ICdmMGQwJywgJ3RydWNrJzogJ2YwZDEnLCAncGludGVyZXN0JzogJ2YwZDInLCAncGludGVyZXN0LXNxdWFyZSc6ICdmMGQzJywgJ2dvb2dsZS1wbHVzLXNxdWFyZSc6ICdmMGQ0JywgJ2dvb2dsZS1wbHVzJzogJ2YwZDUnLCAnbW9uZXknOiAnZjBkNicsICdjYXJldC1kb3duJzogJ2YwZDcnLCAnY2FyZXQtdXAnOiAnZjBkOCcsICdjYXJldC1sZWZ0JzogJ2YwZDknLCAnY2FyZXQtcmlnaHQnOiAnZjBkYScsICdjb2x1bW5zJzogJ2YwZGInLCAndW5zb3J0ZWQsc29ydCc6ICdmMGRjJywgJ3NvcnQtZG93bixzb3J0LWRlc2MnOiAnZjBkZCcsICdzb3J0LXVwLHNvcnQtYXNjJzogJ2YwZGUnLCAnZW52ZWxvcGUnOiAnZjBlMCcsICdsaW5rZWRpbic6ICdmMGUxJywgJ3JvdGF0ZS1sZWZ0LHVuZG8nOiAnZjBlMicsICdsZWdhbCxnYXZlbCc6ICdmMGUzJywgJ2Rhc2hib2FyZCx0YWNob21ldGVyJzogJ2YwZTQnLCAnY29tbWVudC1vJzogJ2YwZTUnLCAnY29tbWVudHMtbyc6ICdmMGU2JywgJ2ZsYXNoLGJvbHQnOiAnZjBlNycsICdzaXRlbWFwJzogJ2YwZTgnLCAndW1icmVsbGEnOiAnZjBlOScsICdwYXN0ZSxjbGlwYm9hcmQnOiAnZjBlYScsICdsaWdodGJ1bGItbyc6ICdmMGViJywgJ2V4Y2hhbmdlJzogJ2YwZWMnLCAnY2xvdWQtZG93bmxvYWQnOiAnZjBlZCcsICdjbG91ZC11cGxvYWQnOiAnZjBlZScsICd1c2VyLW1kJzogJ2YwZjAnLCAnc3RldGhvc2NvcGUnOiAnZjBmMScsICdzdWl0Y2FzZSc6ICdmMGYyJywgJ2JlbGwtbyc6ICdmMGEyJywgJ2NvZmZlZSc6ICdmMGY0JywgJ2N1dGxlcnknOiAnZjBmNScsICdmaWxlLXRleHQtbyc6ICdmMGY2JywgJ2J1aWxkaW5nLW8nOiAnZjBmNycsICdob3NwaXRhbC1vJzogJ2YwZjgnLCAnYW1idWxhbmNlJzogJ2YwZjknLCAnbWVka2l0JzogJ2YwZmEnLCAnZmlnaHRlci1qZXQnOiAnZjBmYicsICdiZWVyJzogJ2YwZmMnLCAnaC1zcXVhcmUnOiAnZjBmZCcsICdwbHVzLXNxdWFyZSc6ICdmMGZlJywgJ2FuZ2xlLWRvdWJsZS1sZWZ0JzogJ2YxMDAnLCAnYW5nbGUtZG91YmxlLXJpZ2h0JzogJ2YxMDEnLCAnYW5nbGUtZG91YmxlLXVwJzogJ2YxMDInLCAnYW5nbGUtZG91YmxlLWRvd24nOiAnZjEwMycsICdhbmdsZS1sZWZ0JzogJ2YxMDQnLCAnYW5nbGUtcmlnaHQnOiAnZjEwNScsICdhbmdsZS11cCc6ICdmMTA2JywgJ2FuZ2xlLWRvd24nOiAnZjEwNycsICdkZXNrdG9wJzogJ2YxMDgnLCAnbGFwdG9wJzogJ2YxMDknLCAndGFibGV0JzogJ2YxMGEnLCAnbW9iaWxlLXBob25lLG1vYmlsZSc6ICdmMTBiJywgJ2NpcmNsZS1vJzogJ2YxMGMnLCAncXVvdGUtbGVmdCc6ICdmMTBkJywgJ3F1b3RlLXJpZ2h0JzogJ2YxMGUnLCAnc3Bpbm5lcic6ICdmMTEwJywgJ2NpcmNsZSc6ICdmMTExJywgJ21haWwtcmVwbHkscmVwbHknOiAnZjExMicsICdnaXRodWItYWx0JzogJ2YxMTMnLCAnZm9sZGVyLW8nOiAnZjExNCcsICdmb2xkZXItb3Blbi1vJzogJ2YxMTUnLCAnc21pbGUtbyc6ICdmMTE4JywgJ2Zyb3duLW8nOiAnZjExOScsICdtZWgtbyc6ICdmMTFhJywgJ2dhbWVwYWQnOiAnZjExYicsICdrZXlib2FyZC1vJzogJ2YxMWMnLCAnZmxhZy1vJzogJ2YxMWQnLCAnZmxhZy1jaGVja2VyZWQnOiAnZjExZScsICd0ZXJtaW5hbCc6ICdmMTIwJywgJ2NvZGUnOiAnZjEyMScsICdtYWlsLXJlcGx5LWFsbCxyZXBseS1hbGwnOiAnZjEyMicsICdzdGFyLWhhbGYtZW1wdHksc3Rhci1oYWxmLWZ1bGwsc3Rhci1oYWxmLW8nOiAnZjEyMycsICdsb2NhdGlvbi1hcnJvdyc6ICdmMTI0JywgJ2Nyb3AnOiAnZjEyNScsICdjb2RlLWZvcmsnOiAnZjEyNicsICd1bmxpbmssY2hhaW4tYnJva2VuJzogJ2YxMjcnLCAncXVlc3Rpb24nOiAnZjEyOCcsICdpbmZvJzogJ2YxMjknLCAnZXhjbGFtYXRpb24nOiAnZjEyYScsICdzdXBlcnNjcmlwdCc6ICdmMTJiJywgJ3N1YnNjcmlwdCc6ICdmMTJjJywgJ2VyYXNlcic6ICdmMTJkJywgJ3B1enpsZS1waWVjZSc6ICdmMTJlJywgJ21pY3JvcGhvbmUnOiAnZjEzMCcsICdtaWNyb3Bob25lLXNsYXNoJzogJ2YxMzEnLCAnc2hpZWxkJzogJ2YxMzInLCAnY2FsZW5kYXItbyc6ICdmMTMzJywgJ2ZpcmUtZXh0aW5ndWlzaGVyJzogJ2YxMzQnLCAncm9ja2V0JzogJ2YxMzUnLCAnbWF4Y2RuJzogJ2YxMzYnLCAnY2hldnJvbi1jaXJjbGUtbGVmdCc6ICdmMTM3JywgJ2NoZXZyb24tY2lyY2xlLXJpZ2h0JzogJ2YxMzgnLCAnY2hldnJvbi1jaXJjbGUtdXAnOiAnZjEzOScsICdjaGV2cm9uLWNpcmNsZS1kb3duJzogJ2YxM2EnLCAnaHRtbDUnOiAnZjEzYicsICdjc3MzJzogJ2YxM2MnLCAnYW5jaG9yJzogJ2YxM2QnLCAndW5sb2NrLWFsdCc6ICdmMTNlJywgJ2J1bGxzZXllJzogJ2YxNDAnLCAnZWxsaXBzaXMtaCc6ICdmMTQxJywgJ2VsbGlwc2lzLXYnOiAnZjE0MicsICdyc3Mtc3F1YXJlJzogJ2YxNDMnLCAncGxheS1jaXJjbGUnOiAnZjE0NCcsICd0aWNrZXQnOiAnZjE0NScsICdtaW51cy1zcXVhcmUnOiAnZjE0NicsICdtaW51cy1zcXVhcmUtbyc6ICdmMTQ3JywgJ2xldmVsLXVwJzogJ2YxNDgnLCAnbGV2ZWwtZG93bic6ICdmMTQ5JywgJ2NoZWNrLXNxdWFyZSc6ICdmMTRhJywgJ3BlbmNpbC1zcXVhcmUnOiAnZjE0YicsICdleHRlcm5hbC1saW5rLXNxdWFyZSc6ICdmMTRjJywgJ3NoYXJlLXNxdWFyZSc6ICdmMTRkJywgJ2NvbXBhc3MnOiAnZjE0ZScsICd0b2dnbGUtZG93bixjYXJldC1zcXVhcmUtby1kb3duJzogJ2YxNTAnLCAndG9nZ2xlLXVwLGNhcmV0LXNxdWFyZS1vLXVwJzogJ2YxNTEnLCAndG9nZ2xlLXJpZ2h0LGNhcmV0LXNxdWFyZS1vLXJpZ2h0JzogJ2YxNTInLCAnZXVybyxldXInOiAnZjE1MycsICdnYnAnOiAnZjE1NCcsICdkb2xsYXIsdXNkJzogJ2YxNTUnLCAncnVwZWUsaW5yJzogJ2YxNTYnLCAnY255LHJtYix5ZW4sanB5JzogJ2YxNTcnLCAncnVibGUscm91YmxlLHJ1Yic6ICdmMTU4JywgJ3dvbixrcncnOiAnZjE1OScsICdiaXRjb2luLGJ0Yyc6ICdmMTVhJywgJ2ZpbGUnOiAnZjE1YicsICdmaWxlLXRleHQnOiAnZjE1YycsICdzb3J0LWFscGhhLWFzYyc6ICdmMTVkJywgJ3NvcnQtYWxwaGEtZGVzYyc6ICdmMTVlJywgJ3NvcnQtYW1vdW50LWFzYyc6ICdmMTYwJywgJ3NvcnQtYW1vdW50LWRlc2MnOiAnZjE2MScsICdzb3J0LW51bWVyaWMtYXNjJzogJ2YxNjInLCAnc29ydC1udW1lcmljLWRlc2MnOiAnZjE2MycsICd0aHVtYnMtdXAnOiAnZjE2NCcsICd0aHVtYnMtZG93bic6ICdmMTY1JywgJ3lvdXR1YmUtc3F1YXJlJzogJ2YxNjYnLCAneW91dHViZSc6ICdmMTY3JywgJ3hpbmcnOiAnZjE2OCcsICd4aW5nLXNxdWFyZSc6ICdmMTY5JywgJ3lvdXR1YmUtcGxheSc6ICdmMTZhJywgJ2Ryb3Bib3gnOiAnZjE2YicsICdzdGFjay1vdmVyZmxvdyc6ICdmMTZjJywgJ2luc3RhZ3JhbSc6ICdmMTZkJywgJ2ZsaWNrcic6ICdmMTZlJywgJ2Fkbic6ICdmMTcwJywgJ2JpdGJ1Y2tldCc6ICdmMTcxJywgJ2JpdGJ1Y2tldC1zcXVhcmUnOiAnZjE3MicsICd0dW1ibHInOiAnZjE3MycsICd0dW1ibHItc3F1YXJlJzogJ2YxNzQnLCAnbG9uZy1hcnJvdy1kb3duJzogJ2YxNzUnLCAnbG9uZy1hcnJvdy11cCc6ICdmMTc2JywgJ2xvbmctYXJyb3ctbGVmdCc6ICdmMTc3JywgJ2xvbmctYXJyb3ctcmlnaHQnOiAnZjE3OCcsICdhcHBsZSc6ICdmMTc5JywgJ3dpbmRvd3MnOiAnZjE3YScsICdhbmRyb2lkJzogJ2YxN2InLCAnbGludXgnOiAnZjE3YycsICdkcmliYmJsZSc6ICdmMTdkJywgJ3NreXBlJzogJ2YxN2UnLCAnZm91cnNxdWFyZSc6ICdmMTgwJywgJ3RyZWxsbyc6ICdmMTgxJywgJ2ZlbWFsZSc6ICdmMTgyJywgJ21hbGUnOiAnZjE4MycsICdnaXR0aXAsZ3JhdGlwYXknOiAnZjE4NCcsICdzdW4tbyc6ICdmMTg1JywgJ21vb24tbyc6ICdmMTg2JywgJ2FyY2hpdmUnOiAnZjE4NycsICdidWcnOiAnZjE4OCcsICd2ayc6ICdmMTg5JywgJ3dlaWJvJzogJ2YxOGEnLCAncmVucmVuJzogJ2YxOGInLCAncGFnZWxpbmVzJzogJ2YxOGMnLCAnc3RhY2stZXhjaGFuZ2UnOiAnZjE4ZCcsICdhcnJvdy1jaXJjbGUtby1yaWdodCc6ICdmMThlJywgJ2Fycm93LWNpcmNsZS1vLWxlZnQnOiAnZjE5MCcsICd0b2dnbGUtbGVmdCxjYXJldC1zcXVhcmUtby1sZWZ0JzogJ2YxOTEnLCAnZG90LWNpcmNsZS1vJzogJ2YxOTInLCAnd2hlZWxjaGFpcic6ICdmMTkzJywgJ3ZpbWVvLXNxdWFyZSc6ICdmMTk0JywgJ3R1cmtpc2gtbGlyYSx0cnknOiAnZjE5NScsICdwbHVzLXNxdWFyZS1vJzogJ2YxOTYnLCAnc3BhY2Utc2h1dHRsZSc6ICdmMTk3JywgJ3NsYWNrJzogJ2YxOTgnLCAnZW52ZWxvcGUtc3F1YXJlJzogJ2YxOTknLCAnd29yZHByZXNzJzogJ2YxOWEnLCAnb3BlbmlkJzogJ2YxOWInLCAnaW5zdGl0dXRpb24sYmFuayx1bml2ZXJzaXR5JzogJ2YxOWMnLCAnbW9ydGFyLWJvYXJkLGdyYWR1YXRpb24tY2FwJzogJ2YxOWQnLCAneWFob28nOiAnZjE5ZScsICdnb29nbGUnOiAnZjFhMCcsICdyZWRkaXQnOiAnZjFhMScsICdyZWRkaXQtc3F1YXJlJzogJ2YxYTInLCAnc3R1bWJsZXVwb24tY2lyY2xlJzogJ2YxYTMnLCAnc3R1bWJsZXVwb24nOiAnZjFhNCcsICdkZWxpY2lvdXMnOiAnZjFhNScsICdkaWdnJzogJ2YxYTYnLCAncGllZC1waXBlci1wcCc6ICdmMWE3JywgJ3BpZWQtcGlwZXItYWx0JzogJ2YxYTgnLCAnZHJ1cGFsJzogJ2YxYTknLCAnam9vbWxhJzogJ2YxYWEnLCAnbGFuZ3VhZ2UnOiAnZjFhYicsICdmYXgnOiAnZjFhYycsICdidWlsZGluZyc6ICdmMWFkJywgJ2NoaWxkJzogJ2YxYWUnLCAncGF3JzogJ2YxYjAnLCAnc3Bvb24nOiAnZjFiMScsICdjdWJlJzogJ2YxYjInLCAnY3ViZXMnOiAnZjFiMycsICdiZWhhbmNlJzogJ2YxYjQnLCAnYmVoYW5jZS1zcXVhcmUnOiAnZjFiNScsICdzdGVhbSc6ICdmMWI2JywgJ3N0ZWFtLXNxdWFyZSc6ICdmMWI3JywgJ3JlY3ljbGUnOiAnZjFiOCcsICdhdXRvbW9iaWxlLGNhcic6ICdmMWI5JywgJ2NhYix0YXhpJzogJ2YxYmEnLCAndHJlZSc6ICdmMWJiJywgJ3Nwb3RpZnknOiAnZjFiYycsICdkZXZpYW50YXJ0JzogJ2YxYmQnLCAnc291bmRjbG91ZCc6ICdmMWJlJywgJ2RhdGFiYXNlJzogJ2YxYzAnLCAnZmlsZS1wZGYtbyc6ICdmMWMxJywgJ2ZpbGUtd29yZC1vJzogJ2YxYzInLCAnZmlsZS1leGNlbC1vJzogJ2YxYzMnLCAnZmlsZS1wb3dlcnBvaW50LW8nOiAnZjFjNCcsICdmaWxlLXBob3RvLW8sZmlsZS1waWN0dXJlLW8sZmlsZS1pbWFnZS1vJzogJ2YxYzUnLCAnZmlsZS16aXAtbyxmaWxlLWFyY2hpdmUtbyc6ICdmMWM2JywgJ2ZpbGUtc291bmQtbyxmaWxlLWF1ZGlvLW8nOiAnZjFjNycsICdmaWxlLW1vdmllLW8sZmlsZS12aWRlby1vJzogJ2YxYzgnLCAnZmlsZS1jb2RlLW8nOiAnZjFjOScsICd2aW5lJzogJ2YxY2EnLCAnY29kZXBlbic6ICdmMWNiJywgJ2pzZmlkZGxlJzogJ2YxY2MnLCAnbGlmZS1ib3V5LGxpZmUtYnVveSxsaWZlLXNhdmVyLHN1cHBvcnQsbGlmZS1yaW5nJzogJ2YxY2QnLCAnY2lyY2xlLW8tbm90Y2gnOiAnZjFjZScsICdyYSxyZXNpc3RhbmNlLHJlYmVsJzogJ2YxZDAnLCAnZ2UsZW1waXJlJzogJ2YxZDEnLCAnZ2l0LXNxdWFyZSc6ICdmMWQyJywgJ2dpdCc6ICdmMWQzJywgJ3ktY29tYmluYXRvci1zcXVhcmUseWMtc3F1YXJlLGhhY2tlci1uZXdzJzogJ2YxZDQnLCAndGVuY2VudC13ZWlibyc6ICdmMWQ1JywgJ3FxJzogJ2YxZDYnLCAnd2VjaGF0LHdlaXhpbic6ICdmMWQ3JywgJ3NlbmQscGFwZXItcGxhbmUnOiAnZjFkOCcsICdzZW5kLW8scGFwZXItcGxhbmUtbyc6ICdmMWQ5JywgJ2hpc3RvcnknOiAnZjFkYScsICdjaXJjbGUtdGhpbic6ICdmMWRiJywgJ2hlYWRlcic6ICdmMWRjJywgJ3BhcmFncmFwaCc6ICdmMWRkJywgJ3NsaWRlcnMnOiAnZjFkZScsICdzaGFyZS1hbHQnOiAnZjFlMCcsICdzaGFyZS1hbHQtc3F1YXJlJzogJ2YxZTEnLCAnYm9tYic6ICdmMWUyJywgJ3NvY2Nlci1iYWxsLW8sZnV0Ym9sLW8nOiAnZjFlMycsICd0dHknOiAnZjFlNCcsICdiaW5vY3VsYXJzJzogJ2YxZTUnLCAncGx1Zyc6ICdmMWU2JywgJ3NsaWRlc2hhcmUnOiAnZjFlNycsICd0d2l0Y2gnOiAnZjFlOCcsICd5ZWxwJzogJ2YxZTknLCAnbmV3c3BhcGVyLW8nOiAnZjFlYScsICd3aWZpJzogJ2YxZWInLCAnY2FsY3VsYXRvcic6ICdmMWVjJywgJ3BheXBhbCc6ICdmMWVkJywgJ2dvb2dsZS13YWxsZXQnOiAnZjFlZScsICdjYy12aXNhJzogJ2YxZjAnLCAnY2MtbWFzdGVyY2FyZCc6ICdmMWYxJywgJ2NjLWRpc2NvdmVyJzogJ2YxZjInLCAnY2MtYW1leCc6ICdmMWYzJywgJ2NjLXBheXBhbCc6ICdmMWY0JywgJ2NjLXN0cmlwZSc6ICdmMWY1JywgJ2JlbGwtc2xhc2gnOiAnZjFmNicsICdiZWxsLXNsYXNoLW8nOiAnZjFmNycsICd0cmFzaCc6ICdmMWY4JywgJ2NvcHlyaWdodCc6ICdmMWY5JywgJ2F0JzogJ2YxZmEnLCAnZXllZHJvcHBlcic6ICdmMWZiJywgJ3BhaW50LWJydXNoJzogJ2YxZmMnLCAnYmlydGhkYXktY2FrZSc6ICdmMWZkJywgJ2FyZWEtY2hhcnQnOiAnZjFmZScsICdwaWUtY2hhcnQnOiAnZjIwMCcsICdsaW5lLWNoYXJ0JzogJ2YyMDEnLCAnbGFzdGZtJzogJ2YyMDInLCAnbGFzdGZtLXNxdWFyZSc6ICdmMjAzJywgJ3RvZ2dsZS1vZmYnOiAnZjIwNCcsICd0b2dnbGUtb24nOiAnZjIwNScsICdiaWN5Y2xlJzogJ2YyMDYnLCAnYnVzJzogJ2YyMDcnLCAnaW94aG9zdCc6ICdmMjA4JywgJ2FuZ2VsbGlzdCc6ICdmMjA5JywgJ2NjJzogJ2YyMGEnLCAnc2hla2VsLHNoZXFlbCxpbHMnOiAnZjIwYicsICdtZWFucGF0aCc6ICdmMjBjJywgJ2J1eXNlbGxhZHMnOiAnZjIwZCcsICdjb25uZWN0ZGV2ZWxvcCc6ICdmMjBlJywgJ2Rhc2hjdWJlJzogJ2YyMTAnLCAnZm9ydW1iZWUnOiAnZjIxMScsICdsZWFucHViJzogJ2YyMTInLCAnc2VsbHN5JzogJ2YyMTMnLCAnc2hpcnRzaW5idWxrJzogJ2YyMTQnLCAnc2ltcGx5YnVpbHQnOiAnZjIxNScsICdza3lhdGxhcyc6ICdmMjE2JywgJ2NhcnQtcGx1cyc6ICdmMjE3JywgJ2NhcnQtYXJyb3ctZG93bic6ICdmMjE4JywgJ2RpYW1vbmQnOiAnZjIxOScsICdzaGlwJzogJ2YyMWEnLCAndXNlci1zZWNyZXQnOiAnZjIxYicsICdtb3RvcmN5Y2xlJzogJ2YyMWMnLCAnc3RyZWV0LXZpZXcnOiAnZjIxZCcsICdoZWFydGJlYXQnOiAnZjIxZScsICd2ZW51cyc6ICdmMjIxJywgJ21hcnMnOiAnZjIyMicsICdtZXJjdXJ5JzogJ2YyMjMnLCAnaW50ZXJzZXgsdHJhbnNnZW5kZXInOiAnZjIyNCcsICd0cmFuc2dlbmRlci1hbHQnOiAnZjIyNScsICd2ZW51cy1kb3VibGUnOiAnZjIyNicsICdtYXJzLWRvdWJsZSc6ICdmMjI3JywgJ3ZlbnVzLW1hcnMnOiAnZjIyOCcsICdtYXJzLXN0cm9rZSc6ICdmMjI5JywgJ21hcnMtc3Ryb2tlLXYnOiAnZjIyYScsICdtYXJzLXN0cm9rZS1oJzogJ2YyMmInLCAnbmV1dGVyJzogJ2YyMmMnLCAnZ2VuZGVybGVzcyc6ICdmMjJkJywgJ2ZhY2Vib29rLW9mZmljaWFsJzogJ2YyMzAnLCAncGludGVyZXN0LXAnOiAnZjIzMScsICd3aGF0c2FwcCc6ICdmMjMyJywgJ3NlcnZlcic6ICdmMjMzJywgJ3VzZXItcGx1cyc6ICdmMjM0JywgJ3VzZXItdGltZXMnOiAnZjIzNScsICdob3RlbCxiZWQnOiAnZjIzNicsICd2aWFjb2luJzogJ2YyMzcnLCAndHJhaW4nOiAnZjIzOCcsICdzdWJ3YXknOiAnZjIzOScsICdtZWRpdW0nOiAnZjIzYScsICd5Yyx5LWNvbWJpbmF0b3InOiAnZjIzYicsICdvcHRpbi1tb25zdGVyJzogJ2YyM2MnLCAnb3BlbmNhcnQnOiAnZjIzZCcsICdleHBlZGl0ZWRzc2wnOiAnZjIzZScsICdiYXR0ZXJ5LTQsYmF0dGVyeS1mdWxsJzogJ2YyNDAnLCAnYmF0dGVyeS0zLGJhdHRlcnktdGhyZWUtcXVhcnRlcnMnOiAnZjI0MScsICdiYXR0ZXJ5LTIsYmF0dGVyeS1oYWxmJzogJ2YyNDInLCAnYmF0dGVyeS0xLGJhdHRlcnktcXVhcnRlcic6ICdmMjQzJywgJ2JhdHRlcnktMCxiYXR0ZXJ5LWVtcHR5JzogJ2YyNDQnLCAnbW91c2UtcG9pbnRlcic6ICdmMjQ1JywgJ2ktY3Vyc29yJzogJ2YyNDYnLCAnb2JqZWN0LWdyb3VwJzogJ2YyNDcnLCAnb2JqZWN0LXVuZ3JvdXAnOiAnZjI0OCcsICdzdGlja3ktbm90ZSc6ICdmMjQ5JywgJ3N0aWNreS1ub3RlLW8nOiAnZjI0YScsICdjYy1qY2InOiAnZjI0YicsICdjYy1kaW5lcnMtY2x1Yic6ICdmMjRjJywgJ2Nsb25lJzogJ2YyNGQnLCAnYmFsYW5jZS1zY2FsZSc6ICdmMjRlJywgJ2hvdXJnbGFzcy1vJzogJ2YyNTAnLCAnaG91cmdsYXNzLTEsaG91cmdsYXNzLXN0YXJ0JzogJ2YyNTEnLCAnaG91cmdsYXNzLTIsaG91cmdsYXNzLWhhbGYnOiAnZjI1MicsICdob3VyZ2xhc3MtMyxob3VyZ2xhc3MtZW5kJzogJ2YyNTMnLCAnaG91cmdsYXNzJzogJ2YyNTQnLCAnaGFuZC1ncmFiLW8saGFuZC1yb2NrLW8nOiAnZjI1NScsICdoYW5kLXN0b3AtbyxoYW5kLXBhcGVyLW8nOiAnZjI1NicsICdoYW5kLXNjaXNzb3JzLW8nOiAnZjI1NycsICdoYW5kLWxpemFyZC1vJzogJ2YyNTgnLCAnaGFuZC1zcG9jay1vJzogJ2YyNTknLCAnaGFuZC1wb2ludGVyLW8nOiAnZjI1YScsICdoYW5kLXBlYWNlLW8nOiAnZjI1YicsICd0cmFkZW1hcmsnOiAnZjI1YycsICdyZWdpc3RlcmVkJzogJ2YyNWQnLCAnY3JlYXRpdmUtY29tbW9ucyc6ICdmMjVlJywgJ2dnJzogJ2YyNjAnLCAnZ2ctY2lyY2xlJzogJ2YyNjEnLCAndHJpcGFkdmlzb3InOiAnZjI2MicsICdvZG5va2xhc3NuaWtpJzogJ2YyNjMnLCAnb2Rub2tsYXNzbmlraS1zcXVhcmUnOiAnZjI2NCcsICdnZXQtcG9ja2V0JzogJ2YyNjUnLCAnd2lraXBlZGlhLXcnOiAnZjI2NicsICdzYWZhcmknOiAnZjI2NycsICdjaHJvbWUnOiAnZjI2OCcsICdmaXJlZm94JzogJ2YyNjknLCAnb3BlcmEnOiAnZjI2YScsICdpbnRlcm5ldC1leHBsb3Jlcic6ICdmMjZiJywgJ3R2LHRlbGV2aXNpb24nOiAnZjI2YycsICdjb250YW8nOiAnZjI2ZCcsICc1MDBweCc6ICdmMjZlJywgJ2FtYXpvbic6ICdmMjcwJywgJ2NhbGVuZGFyLXBsdXMtbyc6ICdmMjcxJywgJ2NhbGVuZGFyLW1pbnVzLW8nOiAnZjI3MicsICdjYWxlbmRhci10aW1lcy1vJzogJ2YyNzMnLCAnY2FsZW5kYXItY2hlY2stbyc6ICdmMjc0JywgJ2luZHVzdHJ5JzogJ2YyNzUnLCAnbWFwLXBpbic6ICdmMjc2JywgJ21hcC1zaWducyc6ICdmMjc3JywgJ21hcC1vJzogJ2YyNzgnLCAnbWFwJzogJ2YyNzknLCAnY29tbWVudGluZyc6ICdmMjdhJywgJ2NvbW1lbnRpbmctbyc6ICdmMjdiJywgJ2hvdXp6JzogJ2YyN2MnLCAndmltZW8nOiAnZjI3ZCcsICdibGFjay10aWUnOiAnZjI3ZScsICdmb250aWNvbnMnOiAnZjI4MCcsICdyZWRkaXQtYWxpZW4nOiAnZjI4MScsICdlZGdlJzogJ2YyODInLCAnY3JlZGl0LWNhcmQtYWx0JzogJ2YyODMnLCAnY29kaWVwaWUnOiAnZjI4NCcsICdtb2R4JzogJ2YyODUnLCAnZm9ydC1hd2Vzb21lJzogJ2YyODYnLCAndXNiJzogJ2YyODcnLCAncHJvZHVjdC1odW50JzogJ2YyODgnLCAnbWl4Y2xvdWQnOiAnZjI4OScsICdzY3JpYmQnOiAnZjI4YScsICdwYXVzZS1jaXJjbGUnOiAnZjI4YicsICdwYXVzZS1jaXJjbGUtbyc6ICdmMjhjJywgJ3N0b3AtY2lyY2xlJzogJ2YyOGQnLCAnc3RvcC1jaXJjbGUtbyc6ICdmMjhlJywgJ3Nob3BwaW5nLWJhZyc6ICdmMjkwJywgJ3Nob3BwaW5nLWJhc2tldCc6ICdmMjkxJywgJ2hhc2h0YWcnOiAnZjI5MicsICdibHVldG9vdGgnOiAnZjI5MycsICdibHVldG9vdGgtYic6ICdmMjk0JywgJ3BlcmNlbnQnOiAnZjI5NScsICdnaXRsYWInOiAnZjI5NicsICd3cGJlZ2lubmVyJzogJ2YyOTcnLCAnd3Bmb3Jtcyc6ICdmMjk4JywgJ2VudmlyYSc6ICdmMjk5JywgJ3VuaXZlcnNhbC1hY2Nlc3MnOiAnZjI5YScsICd3aGVlbGNoYWlyLWFsdCc6ICdmMjliJywgJ3F1ZXN0aW9uLWNpcmNsZS1vJzogJ2YyOWMnLCAnYmxpbmQnOiAnZjI5ZCcsICdhdWRpby1kZXNjcmlwdGlvbic6ICdmMjllJywgJ3ZvbHVtZS1jb250cm9sLXBob25lJzogJ2YyYTAnLCAnYnJhaWxsZSc6ICdmMmExJywgJ2Fzc2lzdGl2ZS1saXN0ZW5pbmctc3lzdGVtcyc6ICdmMmEyJywgJ2FzbC1pbnRlcnByZXRpbmcsYW1lcmljYW4tc2lnbi1sYW5ndWFnZS1pbnRlcnByZXRpbmcnOiAnZjJhMycsICdkZWFmbmVzcyxoYXJkLW9mLWhlYXJpbmcsZGVhZic6ICdmMmE0JywgJ2dsaWRlJzogJ2YyYTUnLCAnZ2xpZGUtZyc6ICdmMmE2JywgJ3NpZ25pbmcsc2lnbi1sYW5ndWFnZSc6ICdmMmE3JywgJ2xvdy12aXNpb24nOiAnZjJhOCcsICd2aWFkZW8nOiAnZjJhOScsICd2aWFkZW8tc3F1YXJlJzogJ2YyYWEnLCAnc25hcGNoYXQnOiAnZjJhYicsICdzbmFwY2hhdC1naG9zdCc6ICdmMmFjJywgJ3NuYXBjaGF0LXNxdWFyZSc6ICdmMmFkJywgJ3BpZWQtcGlwZXInOiAnZjJhZScsICdmaXJzdC1vcmRlcic6ICdmMmIwJywgJ3lvYXN0JzogJ2YyYjEnLCAndGhlbWVpc2xlJzogJ2YyYjInLCAnZ29vZ2xlLXBsdXMtY2lyY2xlLGdvb2dsZS1wbHVzLW9mZmljaWFsJzogJ2YyYjMnLCAnZmEsZm9udC1hd2Vzb21lJzogJ2YyYjQnIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaWNvbihkKSB7XHJcbiAgICAgICAgdmFyIGNvZGU7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25NYXAgJiYgb3B0aW9ucy5zaG93SWNvbnMgJiYgb3B0aW9ucy5pY29ucykge1xyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV0gJiYgb3B0aW9ucy5pY29uTWFwW29wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dXSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbk1hcFtvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXV07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pY29uTWFwW2QubGFiZWxzWzBdXSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbk1hcFtkLmxhYmVsc1swXV07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvZGU7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW1hZ2UoZCkge1xyXG4gICAgICAgIHZhciBpLCBpbWFnZXNGb3JMYWJlbCwgaW1nLCBpbWdMZXZlbCwgbGFiZWwsIGxhYmVsUHJvcGVydHlWYWx1ZSwgcHJvcGVydHksIHZhbHVlO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgaW1hZ2VzRm9yTGFiZWwgPSBvcHRpb25zLmltYWdlTWFwW2QubGFiZWxzWzBdXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpbWFnZXNGb3JMYWJlbCkge1xyXG4gICAgICAgICAgICAgICAgaW1nTGV2ZWwgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpbWFnZXNGb3JMYWJlbC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsUHJvcGVydHlWYWx1ZSA9IGltYWdlc0ZvckxhYmVsW2ldLnNwbGl0KCd8Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZVswXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkLmxhYmVsc1swXSA9PT0gbGFiZWwgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCFwcm9wZXJ0eSB8fCBkLnByb3BlcnRpZXNbcHJvcGVydHldICE9PSB1bmRlZmluZWQpICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICghdmFsdWUgfHwgZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSA9PT0gdmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoID4gaW1nTGV2ZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltZyA9IG9wdGlvbnMuaW1hZ2VzW2ltYWdlc0ZvckxhYmVsW2ldXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltZ0xldmVsID0gbGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGltZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0KF9zZWxlY3RvciwgX29wdGlvbnMpIHtcclxuICAgICAgICBpbml0SWNvbk1hcCgpO1xyXG5cclxuICAgICAgICBtZXJnZShvcHRpb25zLCBfb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25zKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuc2hvd0ljb25zID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghb3B0aW9ucy5taW5Db2xsaXNpb24pIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5taW5Db2xsaXNpb24gPSBvcHRpb25zLm5vZGVSYWRpdXMgKiAyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5pdEltYWdlTWFwKCk7XHJcblxyXG4gICAgICAgIHNlbGVjdG9yID0gX3NlbGVjdG9yO1xyXG5cclxuICAgICAgICBjb250YWluZXIgPSBkMy5zZWxlY3Qoc2VsZWN0b3IpO1xyXG5cclxuICAgICAgICBjb250YWluZXIuYXR0cignY2xhc3MnLCAnbmVvNGpkMycpXHJcbiAgICAgICAgICAgIC5odG1sKCcnKTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5mb1BhbmVsKSB7XHJcbiAgICAgICAgICAgIGluZm8gPSBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGVuZEdyYXBoKGNvbnRhaW5lcik7XHJcbiAgICAgICAgc2ltdWxhdGlvbiA9IGluaXRTaW11bGF0aW9uKCk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLm5lbzRqRGF0YSkge1xyXG4gICAgICAgICAgICBsb2FkTmVvNGpEYXRhKG9wdGlvbnMubmVvNGpEYXRhKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgICAgIGxvYWROZW80akRhdGFGcm9tVXJsKG9wdGlvbnMubmVvNGpEYXRhVXJsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvcjogYm90aCBuZW80akRhdGEgYW5kIG5lbzRqRGF0YVVybCBhcmUgZW1wdHkhJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXRJY29uTWFwKCkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbk1hcCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5LCBpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIga2V5cyA9IGtleS5zcGxpdCgnLCcpLFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcclxuXHJcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmljb25NYXBba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0SW1hZ2VNYXAoKSB7XHJcbiAgICAgICAgdmFyIGtleSwga2V5cywgc2VsZWN0b3I7XHJcblxyXG4gICAgICAgIGZvciAoa2V5IGluIG9wdGlvbnMuaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmltYWdlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICBrZXlzID0ga2V5LnNwbGl0KCd8Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXSA9IFtrZXldO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dLnB1c2goa2V5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0U2ltdWxhdGlvbigpIHtcclxuICAgICAgICB2YXIgc2ltdWxhdGlvbiA9IGQzLmZvcmNlU2ltdWxhdGlvbigpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY29sbGlkZScsIGQzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cyhmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubWluQ29sbGlzaW9uO1xyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLmZvcmNlKCdjaGFyZ2UnLCBkMy5mb3JjZU1hbnlCb2R5KCkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnbGluaycsIGQzLmZvcmNlTGluaygpLmlkKGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5pZDtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY2VudGVyJywgZDMuZm9yY2VDZW50ZXIoc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuY2xpZW50V2lkdGggLyAyLCBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRIZWlnaHQgLyAyKSlcclxuICAgICAgICAgICAgLm9uKCd0aWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdGljaygpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnpvb21GaXQgJiYgIWp1c3RMb2FkZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBqdXN0TG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB6b29tRml0KDIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNpbXVsYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YSgpIHtcclxuICAgICAgICBub2RlcyA9IFtdO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSBbXTtcclxuXHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YUZyb21VcmwobmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gICAgICAgIGQzLmpzb24obmVvNGpEYXRhVXJsLCBmdW5jdGlvbiAoZXJyb3IsIGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNvdXJjZSkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHNvdXJjZVtwcm9wZXJ0eV07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbmVvNGpEYXRhVG9EM0RhdGEoZGF0YSkge1xyXG4gICAgICAgIHZhciBncmFwaCA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5ub2Rlcywgbm9kZS5pZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGgubm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMuZm9yRWFjaChmdW5jdGlvbiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5yZWxhdGlvbnNoaXBzLCByZWxhdGlvbnNoaXAuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5zb3VyY2UgPSByZWxhdGlvbnNoaXAuc3RhcnROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXAudGFyZ2V0ID0gcmVsYXRpb25zaGlwLmVuZE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyYXBoLnJlbGF0aW9uc2hpcHMucHVzaChyZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEuc291cmNlID4gYi5zb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhLnNvdXJjZSA8IGIuc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS50YXJnZXQgPiBiLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhLnRhcmdldCA8IGIudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IDAgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnNvdXJjZSA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS5zb3VyY2UgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnRhcmdldCA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLmxpbmtudW0gPSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLmxpbmtudW0gKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gZ3JhcGg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGZ1bmN0aW9uIGFwcGVuZERhdGFUb05vZGVPdXR3YXJkKHNvdXJjZU5vZGUsIG5ld05vZGVzLCBuZXdSZWxhdGlvbnNoaXBzKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHMgPSBzaXplKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBsYWJlbHM6IG5ld05vZGVzW2ldLmxhYmVscyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld05vZGVzW2ldLnByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB4OiBzb3VyY2VOb2RlLngsXHJcbiAgICAgICAgICAgICAgICB5OiBzb3VyY2VOb2RlLnlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbWFwW25ld05vZGVzW2ldLmlkXSA9IG5vZGUuaWQ7XHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmV3UmVsYXRpb25zaGlwcy5sZW5ndGg7IGorKykge1xyXG5cclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMucmVsYXRpb25zaGlwcyArIDEgKyBqLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogbmV3UmVsYXRpb25zaGlwc1tqXS50eXBlLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBzb3VyY2VOb2RlLmlkLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBtYXBbbmV3UmVsYXRpb25zaGlwc1tqXS5lbmROb2RlXSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld1JlbGF0aW9uc2hpcHNbal0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlTm9kZS5pZCxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogbWFwW25ld1JlbGF0aW9uc2hpcHNbal0uZW5kTm9kZV0sXHJcbiAgICAgICAgICAgICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgalxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIFxyXG4gICAgZnVuY3Rpb24gYXBwZW5kRGF0YVRvTm9kZUlud2FyZChzb3VyY2VOb2RlLCBuZXdOb2RlcywgbmV3UmVsYXRpb25zaGlwcykge1xyXG4gICAgICAgIHZhciBkYXRhID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfSxcclxuICAgICAgICAgICAgbm9kZSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICBzID0gc2l6ZSgpLFxyXG4gICAgICAgICAgICBtYXAgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ld05vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxzOiBuZXdOb2Rlc1tpXS5sYWJlbHMsXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBuZXdOb2Rlc1tpXS5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgeDogc291cmNlTm9kZS54LFxyXG4gICAgICAgICAgICAgICAgeTogc291cmNlTm9kZS55XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIG1hcFtuZXdOb2Rlc1tpXS5pZF0gPSBub2RlLmlkO1xyXG4gICAgICAgICAgICBkYXRhLm5vZGVzW2RhdGEubm9kZXMubGVuZ3RoXSA9IG5vZGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmV3UmVsYXRpb25zaGlwcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5yZWxhdGlvbnNoaXBzICsgMSArIGosXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBuZXdSZWxhdGlvbnNoaXBzW2pdLnR5cGUsXHJcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IG1hcFtuZXdSZWxhdGlvbnNoaXBzW2pdLnN0YXJ0Tm9kZV0sXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBzb3VyY2VOb2RlLmlkLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBuZXdSZWxhdGlvbnNoaXBzW2pdLnByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IG1hcFtuZXdSZWxhdGlvbnNoaXBzW2pdLnN0YXJ0Tm9kZV0sXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHNvdXJjZU5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgalxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJhbmRvbUQzRGF0YShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgICAgIGksXHJcbiAgICAgICAgICAgIGxhYmVsLFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICBudW1Ob2RlcyA9IChtYXhOb2Rlc1RvR2VuZXJhdGUgKiBNYXRoLnJhbmRvbSgpIDw8IDApICsgMSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICBzID0gc2l6ZSgpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1Ob2RlczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxhYmVsID0gcmFuZG9tTGFiZWwoKTtcclxuXHJcbiAgICAgICAgICAgIG5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxzOiBbbGFiZWxdLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbTogbGFiZWxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBkLngsXHJcbiAgICAgICAgICAgICAgICB5OiBkLnlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IGxhYmVsLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IGQuaWQsXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogZC5pZCxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21MYWJlbCgpIHtcclxuICAgICAgICB2YXIgaWNvbnMgPSBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApO1xyXG4gICAgICAgIHJldHVybiBpY29uc1tpY29ucy5sZW5ndGggKiBNYXRoLnJhbmRvbSgpIDw8IDBdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZShjeCwgY3ksIHgsIHksIGFuZ2xlKSB7XHJcbiAgICAgICAgdmFyIHJhZGlhbnMgPSAoTWF0aC5QSSAvIDE4MCkgKiBhbmdsZSxcclxuICAgICAgICAgICAgY29zID0gTWF0aC5jb3MocmFkaWFucyksXHJcbiAgICAgICAgICAgIHNpbiA9IE1hdGguc2luKHJhZGlhbnMpLFxyXG4gICAgICAgICAgICBueCA9IChjb3MgKiAoeCAtIGN4KSkgKyAoc2luICogKHkgLSBjeSkpICsgY3gsXHJcbiAgICAgICAgICAgIG55ID0gKGNvcyAqICh5IC0gY3kpKSAtIChzaW4gKiAoeCAtIGN4KSkgKyBjeTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgeDogbngsIHk6IG55IH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlUG9pbnQoYywgcCwgYW5nbGUpIHtcclxuICAgICAgICByZXR1cm4gcm90YXRlKGMueCwgYy55LCBwLngsIHAueSwgYW5nbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGFyZ2V0LnkgLSBzb3VyY2UueSwgdGFyZ2V0LnggLSBzb3VyY2UueCkgKiAxODAgLyBNYXRoLlBJO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbm9kZXM6IG5vZGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogcmVsYXRpb25zaGlwcy5sZW5ndGhcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgLypcclxuICAgICAgICBmdW5jdGlvbiBzbW9vdGhUcmFuc2Zvcm0oZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSkge1xyXG4gICAgICAgICAgICB2YXIgYW5pbWF0aW9uTWlsbGlzZWNvbmRzID0gNTAwMCxcclxuICAgICAgICAgICAgICAgIHRpbWVvdXRNaWxsaXNlY29uZHMgPSA1MCxcclxuICAgICAgICAgICAgICAgIHN0ZXBzID0gcGFyc2VJbnQoYW5pbWF0aW9uTWlsbGlzZWNvbmRzIC8gdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICBcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgMSwgc3RlcHMpO1xyXG4gICAgICAgICAgICB9LCB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICBmdW5jdGlvbiBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIHN0ZXAsIHN0ZXBzKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9IHN0ZXAgLyBzdGVwcztcclxuICAgIFxyXG4gICAgICAgICAgICBlbGVtLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh0cmFuc2xhdGVbMF0gKiBwcm9ncmVzcykgKyAnLCAnICsgKHRyYW5zbGF0ZVsxXSAqIHByb2dyZXNzKSArICcpIHNjYWxlKCcgKyAoc2NhbGUgKiBwcm9ncmVzcykgKyAnKScpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIGlmIChzdGVwIDwgc3RlcHMpIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCBzdGVwICsgMSwgc3RlcHMpO1xyXG4gICAgICAgICAgICAgICAgfSwgdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAqL1xyXG4gICAgZnVuY3Rpb24gc3RpY2tOb2RlKGQpIHtcclxuICAgICAgICBkLmZ4ID0gZDMuZXZlbnQueDtcclxuICAgICAgICBkLmZ5ID0gZDMuZXZlbnQueTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrKCkge1xyXG4gICAgICAgIHRpY2tOb2RlcygpO1xyXG4gICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja05vZGVzKCkge1xyXG4gICAgICAgIGlmIChub2RlKSB7XHJcbiAgICAgICAgICAgIG5vZGUuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnggKyAnLCAnICsgZC55ICsgJyknO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHMoKSB7XHJcbiAgICAgICAgaWYgKHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgZC5zb3VyY2UueCArICcsICcgKyBkLnNvdXJjZS55ICsgJykgcm90YXRlKCcgKyBhbmdsZSArICcpJztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc1RleHRzKCk7XHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKTtcclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc091dGxpbmVzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcC5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIHJlbCA9IGQzLnNlbGVjdCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIG91dGxpbmUgPSByZWwuc2VsZWN0KCcub3V0bGluZScpLFxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IHJlbC5zZWxlY3QoJy50ZXh0Jyk7XHJcblxyXG4gICAgICAgICAgICBvdXRsaW5lLmF0dHIoJ2QnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Qm91bmRpbmdCb3ggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBhZGRpbmcgPSA1LFxyXG4gICAgICAgICAgICAgICAgICAgIHUgPSB1bml0YXJ5VmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dE1hcmdpbiA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueCkgKiAwLjUsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LnkpICogMC41IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogdGV4dE1hcmdpbi54LCB5OiB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEEyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggKyAobi54IC0gdS54KSAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSArIChuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggKyAoLSBuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55ICsgKC0gbi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRGMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRHMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QTEueCArICcgJyArIHJvdGF0ZWRQb2ludEExLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QjEueCArICcgJyArIHJvdGF0ZWRQb2ludEIxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QzEueCArICcgJyArIHJvdGF0ZWRQb2ludEMxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RDEueCArICcgJyArIHJvdGF0ZWRQb2ludEQxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgWiBNICcgKyByb3RhdGVkUG9pbnRBMi54ICsgJyAnICsgcm90YXRlZFBvaW50QTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMi54ICsgJyAnICsgcm90YXRlZFBvaW50QjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMi54ICsgJyAnICsgcm90YXRlZFBvaW50QzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMi54ICsgJyAnICsgcm90YXRlZFBvaW50RDIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRFMi54ICsgJyAnICsgcm90YXRlZFBvaW50RTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRGMi54ICsgJyAnICsgcm90YXRlZFBvaW50RjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRHMi54ICsgJyAnICsgcm90YXRlZFBvaW50RzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5LmF0dHIoJ2QnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuMSA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCwgNTApLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwIC0gbi54LCB5OiAwIC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSBuLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEMgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggKyBuLnggLSBuMS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSArIG4ueSAtIG4xLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RCA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgbi54IC0gbjEueCwgeTogMCArIG4ueSAtIG4xLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBLnggKyAnICcgKyByb3RhdGVkUG9pbnRBLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCLnggKyAnICcgKyByb3RhdGVkUG9pbnRCLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDLnggKyAnICcgKyByb3RhdGVkUG9pbnRDLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRELnggKyAnICcgKyByb3RhdGVkUG9pbnRELnkgK1xyXG4gICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc1RleHRzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgdmFyIGFuZ2xlID0gKHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCkgKyAzNjApICUgMzYwLFxyXG4gICAgICAgICAgICAgICAgbWlycm9yID0gYW5nbGUgPiA5MCAmJiBhbmdsZSA8IDI3MCxcclxuICAgICAgICAgICAgICAgIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG5XZWlnaHQgPSBtaXJyb3IgPyAyIDogLTMsXHJcbiAgICAgICAgICAgICAgICBwb2ludCA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54KSAqIDAuNSArIG4ueCAqIG5XZWlnaHQsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSkgKiAwLjUgKyBuLnkgKiBuV2VpZ2h0IH0sXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnQgPSByb3RhdGVQb2ludChjZW50ZXIsIHBvaW50LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcm90YXRlZFBvaW50LnggKyAnLCAnICsgcm90YXRlZFBvaW50LnkgKyAnKSByb3RhdGUoJyArIChtaXJyb3IgPyAxODAgOiAwKSArICcpJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0b1N0cmluZyhkKSB7XHJcbiAgICAgICAgdmFyIHMgPSBkLmxhYmVscyA/IGQubGFiZWxzWzBdIDogZC50eXBlO1xyXG5cclxuICAgICAgICBzICs9ICcgKDxpZD46ICcgKyBkLmlkO1xyXG5cclxuICAgICAgICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIHMgKz0gJywgJyArIHByb3BlcnR5ICsgJzogJyArIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzICs9ICcpJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdW5pdGFyeU5vcm1hbFZlY3Rvcihzb3VyY2UsIHRhcmdldCwgbmV3TGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICB2ZWN0b3IgPSB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpO1xyXG5cclxuICAgICAgICByZXR1cm4gcm90YXRlUG9pbnQoY2VudGVyLCB2ZWN0b3IsIDkwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRhcmdldC54IC0gc291cmNlLngsIDIpICsgTWF0aC5wb3codGFyZ2V0LnkgLSBzb3VyY2UueSwgMikpIC8gTWF0aC5zcXJ0KG5ld0xlbmd0aCB8fCAxKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogKHRhcmdldC54IC0gc291cmNlLngpIC8gbGVuZ3RoLFxyXG4gICAgICAgICAgICB5OiAodGFyZ2V0LnkgLSBzb3VyY2UueSkgLyBsZW5ndGgsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSkge1xyXG4gICAgICAgIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhkM0RhdGEubm9kZXMsIGQzRGF0YS5yZWxhdGlvbnNoaXBzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBkM0RhdGEgPSBuZW80akRhdGFUb0QzRGF0YShuZW80akRhdGEpO1xyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVJbmZvKGQpIHtcclxuICAgICAgICBjbGVhckluZm8oKTtcclxuXHJcbiAgICAgICAgaWYgKGQubGFiZWxzKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoJ2NsYXNzJywgZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKCdjbGFzcycsIGQudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsICcmbHQ7aWQmZ3Q7JywgZC5pZCk7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKGQucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eSgncHJvcGVydHknLCBwcm9wZXJ0eSwgSlNPTi5zdHJpbmdpZnkoZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzKG4pIHtcclxuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShub2Rlcywgbik7XHJcblxyXG4gICAgICAgIG5vZGUgPSBzdmdOb2Rlcy5zZWxlY3RBbGwoJy5ub2RlJylcclxuICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuICAgICAgICB2YXIgbm9kZUVudGVyID0gYXBwZW5kTm9kZVRvR3JhcGgoKTtcclxuICAgICAgICBub2RlID0gbm9kZUVudGVyLm1lcmdlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhuLCByKSB7XHJcbiAgICAgICAgdXBkYXRlUmVsYXRpb25zaGlwcyhyKTtcclxuICAgICAgICB1cGRhdGVOb2RlcyhuKTtcclxuXHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVJlbGF0aW9uc2hpcHMocikge1xyXG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlbGF0aW9uc2hpcHMsIHIpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSBzdmdSZWxhdGlvbnNoaXBzLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgIC5kYXRhKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuXHJcbiAgICAgICAgdmFyIHJlbGF0aW9uc2hpcEVudGVyID0gYXBwZW5kUmVsYXRpb25zaGlwVG9HcmFwaCgpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSByZWxhdGlvbnNoaXBFbnRlci5yZWxhdGlvbnNoaXAubWVyZ2UocmVsYXRpb25zaGlwKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm91dGxpbmUnKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdXRsaW5lID0gcmVsYXRpb25zaGlwRW50ZXIub3V0bGluZS5tZXJnZShyZWxhdGlvbnNoaXBPdXRsaW5lKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3ZlcmxheSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm92ZXJsYXknKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5ID0gcmVsYXRpb25zaGlwRW50ZXIub3ZlcmxheS5tZXJnZShyZWxhdGlvbnNoaXBPdmVybGF5KTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwVGV4dCA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLnRleHQnKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0ID0gcmVsYXRpb25zaGlwRW50ZXIudGV4dC5tZXJnZShyZWxhdGlvbnNoaXBUZXh0KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB2ZXJzaW9uKCkge1xyXG4gICAgICAgIHJldHVybiBWRVJTSU9OO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHpvb21GaXQodHJhbnNpdGlvbkR1cmF0aW9uKSB7XHJcbiAgICAgICAgdmFyIGJvdW5kcyA9IHN2Zy5ub2RlKCkuZ2V0QkJveCgpLFxyXG4gICAgICAgICAgICBwYXJlbnQgPSBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudCxcclxuICAgICAgICAgICAgZnVsbFdpZHRoID0gcGFyZW50LmNsaWVudFdpZHRoLFxyXG4gICAgICAgICAgICBmdWxsSGVpZ2h0ID0gcGFyZW50LmNsaWVudEhlaWdodCxcclxuICAgICAgICAgICAgd2lkdGggPSBib3VuZHMud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA9IGJvdW5kcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIG1pZFggPSBib3VuZHMueCArIHdpZHRoIC8gMixcclxuICAgICAgICAgICAgbWlkWSA9IGJvdW5kcy55ICsgaGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgaWYgKHdpZHRoID09PSAwIHx8IGhlaWdodCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47IC8vIG5vdGhpbmcgdG8gZml0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdmdTY2FsZSA9IDAuODUgLyBNYXRoLm1heCh3aWR0aCAvIGZ1bGxXaWR0aCwgaGVpZ2h0IC8gZnVsbEhlaWdodCk7XHJcbiAgICAgICAgc3ZnVHJhbnNsYXRlID0gW2Z1bGxXaWR0aCAvIDIgLSBzdmdTY2FsZSAqIG1pZFgsIGZ1bGxIZWlnaHQgLyAyIC0gc3ZnU2NhbGUgKiBtaWRZXTtcclxuXHJcbiAgICAgICAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHN2Z1RyYW5zbGF0ZVswXSArICcsICcgKyBzdmdUcmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc3ZnU2NhbGUgKyAnKScpO1xyXG4gICAgICAgIC8vICAgICAgICBzbW9vdGhUcmFuc2Zvcm0oc3ZnVHJhbnNsYXRlLCBzdmdTY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVzZXRXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbihfb3B0aW9ucywgeyBuZW80akRhdGE6IG5lbzRqRGF0YSwgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQgfSk7XHJcbiAgICAgICAgaW5pdChfc2VsZWN0b3IsIG5ld09wdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUoc291cmNlTm9kZSkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSByZWxhdGlvbnNoaXBzLmZpbHRlcihmdW5jdGlvbihyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICAgICAgaWYocmVsYXRpb25zaGlwLnNvdXJjZSA9PT0gc291cmNlTm9kZSB8fCByZWxhdGlvbnNoaXAudGFyZ2V0ID09PSBzb3VyY2VOb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoXCIjXCIgKyByZWxhdGlvbnNoaXAudXVpZCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIG5vZGVzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGUgIT09IHNvdXJjZU5vZGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGQzLnNlbGVjdChcIiNcIiArIHNvdXJjZU5vZGUudXVpZCkucmVtb3ZlKCk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGd1aWQoKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gczQoKSB7XHJcbiAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcclxuICAgICAgICAgICAgLnRvU3RyaW5nKDE2KVxyXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJ2cnICsgczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICBpbml0KF9zZWxlY3RvciwgX29wdGlvbnMpO1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVWaWV3cyhrZXlzKSB7XHJcbiAgICAgICAgdmFyIGNpcmNsZXMgPSBkMy5zZWxlY3QoJ3N2ZycpLnNlbGVjdEFsbCgnY2lyY2xlLnZpZXdzJykuZGF0YShrZXlzKTtcclxuICAgICAgICB2YXIgcj0yMDtcclxuICAgICAgICBjaXJjbGVzLmVudGVyKCkuYXBwZW5kKCdyZWN0JykuY2xhc3NlZCgndmlld3MnLCB0cnVlKVxyXG4gICAgICAgIC5hdHRyKCd4JywgcilcclxuICAgICAgICAuYXR0cigneScsIGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChrZXlzLmluZGV4T2Yobm9kZSkrMSkqMi4yKnIgKyAyNztcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5hdHRyKCdyeCcsIHIvMylcclxuICAgICAgICAuYXR0cigncngnLCByLzMpXHJcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgcio0KVxyXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCByKVxyXG4gICAgICAgIC5hdHRyKCdmaWxsJywgZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gY29sb3JzKClba2V5cy5pbmRleE9mKG5vZGUpKzFdO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmF0dHIoJ3N0cm9rZScsIGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmF0dHIoJ3N0cm9rZS13aWR0aCcsIGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwiMC41cHhcIjtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIFwicG9pbnRlclwiKVxyXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbihuKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzQ2xpY2tIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NDbGlja0hhbmRsZXIobik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgdGV4dCA9IGQzLnNlbGVjdCgnc3ZnJykuc2VsZWN0QWxsKCd0ZXh0LnZpZXdzJykuZGF0YShrZXlzKTtcclxuICAgICAgICB0ZXh0LmVudGVyKCkuYXBwZW5kKCd0ZXh0JykuY2xhc3NlZCgndmlld3MnLHRydWUpXHJcbiAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ2xlZnQnKVxyXG4gICAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsICdib2xkJylcclxuICAgICAgICAuYXR0cignc3Ryb2tlLXdpZHRoJyAsICcwJylcclxuICAgICAgICAuYXR0cignc3Ryb2tlLWNvbG9yJyAsICd3aGl0ZScpXHJcbiAgICAgICAgLmF0dHIoJ2ZpbGwnICwgJyM2OTY5NjknKVxyXG4gICAgICAgIC5hdHRyKCd4JyAsIDIqcilcclxuICAgICAgICAuYXR0cignZm9udC1zaXplJyAsIFwiMTBweFwiKVxyXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIFwicG9pbnRlclwiKVxyXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgfSkuYXR0cigneScsIGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChrZXlzLmluZGV4T2Yobm9kZSkrMSkqMi4yKnIrNDA7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24obikge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c0NsaWNrSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzQ2xpY2tIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNpcmNsZXMuZXhpdCgpLnJlbW92ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlOiBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlLFxyXG4gICAgICAgIG5lbzRqRGF0YVRvRDNEYXRhOiBuZW80akRhdGFUb0QzRGF0YSxcclxuICAgICAgICByYW5kb21EM0RhdGE6IHJhbmRvbUQzRGF0YSxcclxuICAgICAgICBzaXplOiBzaXplLFxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGE6IHVwZGF0ZVdpdGhEM0RhdGEsXHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YTogdXBkYXRlV2l0aE5lbzRqRGF0YSxcclxuICAgICAgICBhcHBlbmREYXRhVG9Ob2RlT3V0d2FyZDogYXBwZW5kRGF0YVRvTm9kZU91dHdhcmQsXHJcbiAgICAgICAgYXBwZW5kRGF0YVRvTm9kZUlud2FyZDogYXBwZW5kRGF0YVRvTm9kZUlud2FyZCxcclxuICAgICAgICByZXNldFdpdGhOZW80akRhdGE6IHJlc2V0V2l0aE5lbzRqRGF0YSxcclxuICAgICAgICByZW1vdmVOb2RlOiByZW1vdmVOb2RlLFxyXG4gICAgICAgIGNyZWF0ZVZpZXdzOiBjcmVhdGVWaWV3cyxcclxuICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uXHJcbiAgICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE5lbzRqRDM7XHJcbiJdfQ==
