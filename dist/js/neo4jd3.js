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
            .attr('id', function (d) {
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

        relationshipsCopy = relationships.map(function (a) {
            return Object.assign({}, a);
        });
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

    function expandNode(currentNode) {

        var data = {
            nodes: [],
            relationships: []
        };

        var s = size();

        currentNode.previous.forEach(function (n, i) {
            // Create new node
            var node = {
                id: n.node.id,
                labels: n.node.labels,
                properties: n.node.properties,
                x: currentNode.x,
                y: currentNode.y
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
            return rules.link === link.type.toLowerCase() && link.target.labels[0] === rules[node.labels[0].toLowerCase()];
        });

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBuZW80amQzID0gcmVxdWlyZSgnLi9zY3JpcHRzL25lbzRqZDMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZW80amQzO1xuIiwiLyogZ2xvYmFsIGQzLCBkb2N1bWVudCAqL1xyXG4vKiBqc2hpbnQgbGF0ZWRlZjpub2Z1bmMgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gTmVvNGpEMyhfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICB2YXIgY29udGFpbmVyLCBncmFwaCwgaW5mbywgbm9kZSwgbm9kZXMsIHJlbGF0aW9uc2hpcCwgcmVsYXRpb25zaGlwT3V0bGluZSwgcmVsYXRpb25zaGlwT3ZlcmxheSwgcmVsYXRpb25zaGlwVGV4dCwgcmVsYXRpb25zaGlwcywgcmVsYXRpb25zaGlwc0NvcHksIHNlbGVjdG9yLCBzaW11bGF0aW9uLCBzdmcsIHN2Z05vZGVzLCBzdmdSZWxhdGlvbnNoaXBzLCBzdmdTY2FsZSwgc3ZnVHJhbnNsYXRlLFxyXG4gICAgICAgIGNsYXNzZXMyY29sb3JzID0ge30sXHJcbiAgICAgICAganVzdExvYWRlZCA9IGZhbHNlLFxyXG4gICAgICAgIG51bUNsYXNzZXMgPSAwLFxyXG4gICAgICAgIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIGFycm93U2l6ZTogNCxcclxuICAgICAgICAgICAgY29sb3JzOiBjb2xvcnMoKSxcclxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGljb25NYXA6IGZvbnRBd2Vzb21lSWNvbnMoKSxcclxuICAgICAgICAgICAgaWNvbnM6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaW1hZ2VNYXA6IHt9LFxyXG4gICAgICAgICAgICBpbWFnZXM6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaW5mb1BhbmVsOiB0cnVlLFxyXG4gICAgICAgICAgICBtaW5Db2xsaXNpb246IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbmVvNGpEYXRhOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5lbzRqRGF0YVVybDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBub2RlT3V0bGluZUZpbGxDb2xvcjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBub2RlUmFkaXVzOiAyNSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwQ29sb3I6ICcjYTVhYmI2JyxcclxuICAgICAgICAgICAgem9vbUZpdDogZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIFZFUlNJT04gPSAnMC4wLjEnO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEdyYXBoKGNvbnRhaW5lcikge1xyXG4gICAgICAgIHN2ZyA9IGNvbnRhaW5lci5hcHBlbmQoJ3N2ZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICcxMDAlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMtZ3JhcGgnKVxyXG4gICAgICAgICAgICAuY2FsbChkMy56b29tKCkub24oJ3pvb20nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSBkMy5ldmVudC50cmFuc2Zvcm0uayxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGUgPSBbZDMuZXZlbnQudHJhbnNmb3JtLngsIGQzLmV2ZW50LnRyYW5zZm9ybS55XTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3ZnVHJhbnNsYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlWzBdICs9IHN2Z1RyYW5zbGF0ZVswXTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGVbMV0gKz0gc3ZnVHJhbnNsYXRlWzFdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdmdTY2FsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlICo9IHN2Z1NjYWxlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHN2Zy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0cmFuc2xhdGVbMF0gKyAnLCAnICsgdHJhbnNsYXRlWzFdICsgJykgc2NhbGUoJyArIHNjYWxlICsgJyknKTtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIC5vbignZGJsY2xpY2suem9vbScsIG51bGwpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMTAwJScpO1xyXG5cclxuICAgICAgICBzdmdSZWxhdGlvbnNoaXBzID0gc3ZnLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyZWxhdGlvbnNoaXBzJyk7XHJcblxyXG4gICAgICAgIHN2Z05vZGVzID0gc3ZnLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlcycpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEltYWdlVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2ltYWdlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4JyA6ICczMHB4JztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3gnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAnNXB4JyA6ICctMTVweCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCd4bGluazpocmVmJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpbWFnZShkKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3knLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAnNXB4JyA6ICctMTZweCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4JyA6ICczMHB4JztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb1BhbmVsKGNvbnRhaW5lcikge1xyXG4gICAgICAgIHJldHVybiBjb250YWluZXIuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnbmVvNGpkMy1pbmZvJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBpc05vZGUsIHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIHZhciBlbGVtID0gaW5mby5hcHBlbmQoJ2EnKTtcclxuXHJcbiAgICAgICAgZWxlbS5hdHRyKCdocmVmJywgJyMnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCBjbHMpXHJcbiAgICAgICAgICAgIC5odG1sKCc8c3Ryb25nPicgKyBwcm9wZXJ0eSArICc8L3N0cm9uZz4nICsgKHZhbHVlID8gKCc6ICcgKyB2YWx1ZSkgOiAnJykpO1xyXG5cclxuICAgICAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgICAgICAgIGVsZW0uc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yIDogKGlzTm9kZSA/IGNsYXNzMmNvbG9yKHByb3BlcnR5KSA6IGRlZmF1bHRDb2xvcigpKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnYm9yZGVyLWNvbG9yJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogKGlzTm9kZSA/IGNsYXNzMmRhcmtlbkNvbG9yKHByb3BlcnR5KSA6IGRlZmF1bHREYXJrZW5Db2xvcigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2NvbG9yJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IGNsYXNzMmRhcmtlbkNvbG9yKG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IpIDogJyNmZmYnO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoY2xzLCBub2RlKSB7XHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCB0cnVlLCBub2RlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KGNscywgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBmYWxzZSwgcHJvcGVydHksIHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudFJlbGF0aW9uc2hpcChjbHMsIHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHJlbGF0aW9uc2hpcCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kQ29udGV4dE1lbnUobm9kZSwgaW5kZXgpIHtcclxuICAgICAgICAvLyBDcmVhdGUgdGhlIGNvbnRhaW5lciBmb3IgdGhlIGNvbnRleHQgbWVudVxyXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnLmNvbnRleHQtbWVudScpLmRhdGEoWzFdKVxyXG4gICAgICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnY29udGV4dC1tZW51Jyk7XHJcblxyXG4gICAgICAgIC8vIEhpZGUgdGhlIGNvbnRleHQtbWVudSBpZiBpdCBnb2VzIG91dCBvZiBmb2N1cyBcclxuICAgICAgICBkMy5zZWxlY3QoJ2JvZHknKS5vbignY2xpY2suY29udGV4dC1tZW51JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBkMy5zZWxlY3QoJy5jb250ZXh0LW1lbnUnKS5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFwcGVuZCBkYXRhIHRvIHRoZSBjb250ZXh0IG1lbnVcclxuICAgICAgICBkMy5zZWxlY3RBbGwoJy5jb250ZXh0LW1lbnUnKVxyXG4gICAgICAgICAgICAuaHRtbCgnJylcclxuICAgICAgICAgICAgLmFwcGVuZCgndWwnKVxyXG4gICAgICAgICAgICAuc2VsZWN0QWxsKCdsaScpXHJcbiAgICAgICAgICAgIC5kYXRhKG9wdGlvbnMuY29udGV4dE1lbnUpXHJcbiAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2xpJylcclxuICAgICAgICAgICAgLm9uKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uaGFuZGxlcihub2RlKTtcclxuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCgnLmNvbnRleHQtbWVudScpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmFwcGVuZCgnaScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5pY29uO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiIFwiICsgZC50ZXh0O1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gU2hvdyB0aGUgY29udGV4dCBtZW51XHJcbiAgICAgICAgZDMuc2VsZWN0KCcuY29udGV4dC1tZW51JylcclxuICAgICAgICAgICAgLnN0eWxlKCdsZWZ0JywgKGQzLmV2ZW50LnBhZ2VYIC0gMikgKyAncHgnKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ3RvcCcsIChkMy5ldmVudC5wYWdlWSAtIDIpICsgJ3B4JylcclxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmROb2RlKCkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmVudGVyKClcclxuICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5vbignY29udGV4dG1lbnUnLCBhcHBlbmRDb250ZXh0TWVudSlcclxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGQudXVpZCA9IGd1aWQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnV1aWQ7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaGlnaGxpZ2h0LCBpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgPSAnbm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBkLmxhYmVsc1swXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaWNvbihkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWljb24nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpbWFnZShkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWltYWdlJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBjbGFzc2VzO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEb3VibGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIoZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uIChkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUoZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5jYWxsKGQzLmRyYWcoKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdzdGFydCcsIGRyYWdTdGFydGVkKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdkcmFnJywgZHJhZ2dlZClcclxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgZHJhZ0VuZGVkKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kTm9kZVRvR3JhcGgoKSB7XHJcbiAgICAgICAgdmFyIG4gPSBhcHBlbmROb2RlKCk7XHJcblxyXG4gICAgICAgIGFwcGVuZFJpbmdUb05vZGUobik7XHJcbiAgICAgICAgYXBwZW5kT3V0bGluZVRvTm9kZShuKTtcclxuICAgICAgICBhcHBlbmRUZXh0VG9Ob2RlKG4pO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW1hZ2VUb05vZGUobik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdXRsaW5lVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdvdXRsaW5lJylcclxuICAgICAgICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMpXHJcbiAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiBjbGFzczJjb2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiBjbGFzczJkYXJrZW5Db2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSaW5nVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyaW5nJylcclxuICAgICAgICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMgKiAxLjE2KVxyXG4gICAgICAgICAgICAuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZyhkKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kVGV4dFRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnByb3BlcnRpZXMubmFtZTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzAwMDAwMCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAob3B0aW9ucy5ub2RlUmFkaXVzICsgJ3B4JykgOiAnMTBweCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcclxuICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gKHBhcnNlSW50KE1hdGgucm91bmQob3B0aW9ucy5ub2RlUmFkaXVzICogMC4zMikpICsgJ3B4JykgOiAnNHB4JztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmFuZG9tRGF0YVRvTm9kZShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHJhbmRvbUQzRGF0YShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpO1xyXG4gICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwKCkge1xyXG4gICAgICAgIHJldHVybiByZWxhdGlvbnNoaXAuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGQudXVpZCA9IGd1aWQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnV1aWQ7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdyZWxhdGlvbnNoaXAnKVxyXG4gICAgICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdXRsaW5lVG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdvdXRsaW5lJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2E1YWJiNicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ292ZXJsYXknKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzAwMDAwMCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnOHB4JylcclxuICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnR5cGU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKSB7XHJcbiAgICAgICAgdmFyIHJlbGF0aW9uc2hpcCA9IGFwcGVuZFJlbGF0aW9uc2hpcCgpLFxyXG4gICAgICAgICAgICB0ZXh0ID0gYXBwZW5kVGV4dFRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCksXHJcbiAgICAgICAgICAgIG91dGxpbmUgPSBhcHBlbmRPdXRsaW5lVG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKSxcclxuICAgICAgICAgICAgb3ZlcmxheSA9IGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBvdXRsaW5lOiBvdXRsaW5lLFxyXG4gICAgICAgICAgICBvdmVybGF5OiBvdmVybGF5LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IHJlbGF0aW9uc2hpcCxcclxuICAgICAgICAgICAgdGV4dDogdGV4dFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xhc3MyY29sb3IoY2xzKSB7XHJcbiAgICAgICAgdmFyIGNvbG9yID0gY2xhc3NlczJjb2xvcnNbY2xzXTtcclxuXHJcbiAgICAgICAgaWYgKCFjb2xvcikge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgIGNvbG9yID0gb3B0aW9ucy5jb2xvcnNbTWF0aC5taW4obnVtQ2xhc3Nlcywgb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMSldO1xyXG4gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW251bUNsYXNzZXMgJSBvcHRpb25zLmNvbG9ycy5sZW5ndGhdO1xyXG4gICAgICAgICAgICBjbGFzc2VzMmNvbG9yc1tjbHNdID0gY29sb3I7XHJcbiAgICAgICAgICAgIG51bUNsYXNzZXMrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGFzczJkYXJrZW5Db2xvcihjbHMpIHtcclxuICAgICAgICByZXR1cm4gZDMucmdiKGNsYXNzMmNvbG9yKGNscykpLmRhcmtlcigxKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGVhckluZm8oKSB7XHJcbiAgICAgICAgaW5mby5odG1sKCcnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb2xvcnMoKSB7XHJcbiAgICAgICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkxMCxcclxuICAgICAgICAvLyBkMy5zY2hlbWVDYXRlZ29yeTIwLFxyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICcjNjhiZGY2JywgLy8gbGlnaHQgYmx1ZVxyXG4gICAgICAgICAgICAnIzZkY2U5ZScsIC8vIGdyZWVuICMxXHJcbiAgICAgICAgICAgICcjZmFhZmMyJywgLy8gbGlnaHQgcGlua1xyXG4gICAgICAgICAgICAnI2YyYmFmNicsIC8vIHB1cnBsZVxyXG4gICAgICAgICAgICAnI2ZmOTI4YycsIC8vIGxpZ2h0IHJlZFxyXG4gICAgICAgICAgICAnI2ZjZWE3ZScsIC8vIGxpZ2h0IHllbGxvd1xyXG4gICAgICAgICAgICAnI2ZmYzc2NicsIC8vIGxpZ2h0IG9yYW5nZVxyXG4gICAgICAgICAgICAnIzQwNWY5ZScsIC8vIG5hdnkgYmx1ZVxyXG4gICAgICAgICAgICAnI2E1YWJiNicsIC8vIGRhcmsgZ3JheVxyXG4gICAgICAgICAgICAnIzc4Y2VjYicsIC8vIGdyZWVuICMyLFxyXG4gICAgICAgICAgICAnI2I4OGNiYicsIC8vIGRhcmsgcHVycGxlXHJcbiAgICAgICAgICAgICcjY2VkMmQ5JywgLy8gbGlnaHQgZ3JheVxyXG4gICAgICAgICAgICAnI2U4NDY0NicsIC8vIGRhcmsgcmVkXHJcbiAgICAgICAgICAgICcjZmE1Zjg2JywgLy8gZGFyayBwaW5rXHJcbiAgICAgICAgICAgICcjZmZhYjFhJywgLy8gZGFyayBvcmFuZ2VcclxuICAgICAgICAgICAgJyNmY2RhMTknLCAvLyBkYXJrIHllbGxvd1xyXG4gICAgICAgICAgICAnIzc5N2I4MCcsIC8vIGJsYWNrXHJcbiAgICAgICAgICAgICcjYzlkOTZmJywgLy8gcGlzdGFjY2hpb1xyXG4gICAgICAgICAgICAnIzQ3OTkxZicsIC8vIGdyZWVuICMzXHJcbiAgICAgICAgICAgICcjNzBlZGVlJywgLy8gdHVycXVvaXNlXHJcbiAgICAgICAgICAgICcjZmY3NWVhJyAgLy8gcGlua1xyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29udGFpbnMoYXJyYXksIGlkKSB7XHJcbiAgICAgICAgdmFyIGZpbHRlciA9IGFycmF5LmZpbHRlcihmdW5jdGlvbiAoZWxlbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbS5pZCA9PT0gaWQ7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmaWx0ZXIubGVuZ3RoID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0Q29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucmVsYXRpb25zaGlwQ29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVmYXVsdERhcmtlbkNvbG9yKCkge1xyXG4gICAgICAgIHJldHVybiBkMy5yZ2Iob3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMV0pLmRhcmtlcigxKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnRW5kZWQoZCkge1xyXG4gICAgICAgIGlmICghZDMuZXZlbnQuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ0VuZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcHRpb25zLm9uTm9kZURyYWdFbmQoZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xyXG4gICAgICAgIHN0aWNrTm9kZShkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnU3RhcnRlZChkKSB7XHJcbiAgICAgICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjMpLnJlc3RhcnQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGQuZnggPSBkLng7XHJcbiAgICAgICAgZC5meSA9IGQueTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURyYWdTdGFydCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcHRpb25zLm9uTm9kZURyYWdTdGFydChkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iajEsIG9iajIpIHtcclxuICAgICAgICB2YXIgb2JqID0ge307XHJcblxyXG4gICAgICAgIG1lcmdlKG9iaiwgb2JqMSk7XHJcbiAgICAgICAgbWVyZ2Uob2JqLCBvYmoyKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmb250QXdlc29tZUljb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7ICdnbGFzcyc6ICdmMDAwJywgJ211c2ljJzogJ2YwMDEnLCAnc2VhcmNoJzogJ2YwMDInLCAnZW52ZWxvcGUtbyc6ICdmMDAzJywgJ2hlYXJ0JzogJ2YwMDQnLCAnc3Rhcic6ICdmMDA1JywgJ3N0YXItbyc6ICdmMDA2JywgJ3VzZXInOiAnZjAwNycsICdmaWxtJzogJ2YwMDgnLCAndGgtbGFyZ2UnOiAnZjAwOScsICd0aCc6ICdmMDBhJywgJ3RoLWxpc3QnOiAnZjAwYicsICdjaGVjayc6ICdmMDBjJywgJ3JlbW92ZSxjbG9zZSx0aW1lcyc6ICdmMDBkJywgJ3NlYXJjaC1wbHVzJzogJ2YwMGUnLCAnc2VhcmNoLW1pbnVzJzogJ2YwMTAnLCAncG93ZXItb2ZmJzogJ2YwMTEnLCAnc2lnbmFsJzogJ2YwMTInLCAnZ2Vhcixjb2cnOiAnZjAxMycsICd0cmFzaC1vJzogJ2YwMTQnLCAnaG9tZSc6ICdmMDE1JywgJ2ZpbGUtbyc6ICdmMDE2JywgJ2Nsb2NrLW8nOiAnZjAxNycsICdyb2FkJzogJ2YwMTgnLCAnZG93bmxvYWQnOiAnZjAxOScsICdhcnJvdy1jaXJjbGUtby1kb3duJzogJ2YwMWEnLCAnYXJyb3ctY2lyY2xlLW8tdXAnOiAnZjAxYicsICdpbmJveCc6ICdmMDFjJywgJ3BsYXktY2lyY2xlLW8nOiAnZjAxZCcsICdyb3RhdGUtcmlnaHQscmVwZWF0JzogJ2YwMWUnLCAncmVmcmVzaCc6ICdmMDIxJywgJ2xpc3QtYWx0JzogJ2YwMjInLCAnbG9jayc6ICdmMDIzJywgJ2ZsYWcnOiAnZjAyNCcsICdoZWFkcGhvbmVzJzogJ2YwMjUnLCAndm9sdW1lLW9mZic6ICdmMDI2JywgJ3ZvbHVtZS1kb3duJzogJ2YwMjcnLCAndm9sdW1lLXVwJzogJ2YwMjgnLCAncXJjb2RlJzogJ2YwMjknLCAnYmFyY29kZSc6ICdmMDJhJywgJ3RhZyc6ICdmMDJiJywgJ3RhZ3MnOiAnZjAyYycsICdib29rJzogJ2YwMmQnLCAnYm9va21hcmsnOiAnZjAyZScsICdwcmludCc6ICdmMDJmJywgJ2NhbWVyYSc6ICdmMDMwJywgJ2ZvbnQnOiAnZjAzMScsICdib2xkJzogJ2YwMzInLCAnaXRhbGljJzogJ2YwMzMnLCAndGV4dC1oZWlnaHQnOiAnZjAzNCcsICd0ZXh0LXdpZHRoJzogJ2YwMzUnLCAnYWxpZ24tbGVmdCc6ICdmMDM2JywgJ2FsaWduLWNlbnRlcic6ICdmMDM3JywgJ2FsaWduLXJpZ2h0JzogJ2YwMzgnLCAnYWxpZ24tanVzdGlmeSc6ICdmMDM5JywgJ2xpc3QnOiAnZjAzYScsICdkZWRlbnQsb3V0ZGVudCc6ICdmMDNiJywgJ2luZGVudCc6ICdmMDNjJywgJ3ZpZGVvLWNhbWVyYSc6ICdmMDNkJywgJ3Bob3RvLGltYWdlLHBpY3R1cmUtbyc6ICdmMDNlJywgJ3BlbmNpbCc6ICdmMDQwJywgJ21hcC1tYXJrZXInOiAnZjA0MScsICdhZGp1c3QnOiAnZjA0MicsICd0aW50JzogJ2YwNDMnLCAnZWRpdCxwZW5jaWwtc3F1YXJlLW8nOiAnZjA0NCcsICdzaGFyZS1zcXVhcmUtbyc6ICdmMDQ1JywgJ2NoZWNrLXNxdWFyZS1vJzogJ2YwNDYnLCAnYXJyb3dzJzogJ2YwNDcnLCAnc3RlcC1iYWNrd2FyZCc6ICdmMDQ4JywgJ2Zhc3QtYmFja3dhcmQnOiAnZjA0OScsICdiYWNrd2FyZCc6ICdmMDRhJywgJ3BsYXknOiAnZjA0YicsICdwYXVzZSc6ICdmMDRjJywgJ3N0b3AnOiAnZjA0ZCcsICdmb3J3YXJkJzogJ2YwNGUnLCAnZmFzdC1mb3J3YXJkJzogJ2YwNTAnLCAnc3RlcC1mb3J3YXJkJzogJ2YwNTEnLCAnZWplY3QnOiAnZjA1MicsICdjaGV2cm9uLWxlZnQnOiAnZjA1MycsICdjaGV2cm9uLXJpZ2h0JzogJ2YwNTQnLCAncGx1cy1jaXJjbGUnOiAnZjA1NScsICdtaW51cy1jaXJjbGUnOiAnZjA1NicsICd0aW1lcy1jaXJjbGUnOiAnZjA1NycsICdjaGVjay1jaXJjbGUnOiAnZjA1OCcsICdxdWVzdGlvbi1jaXJjbGUnOiAnZjA1OScsICdpbmZvLWNpcmNsZSc6ICdmMDVhJywgJ2Nyb3NzaGFpcnMnOiAnZjA1YicsICd0aW1lcy1jaXJjbGUtbyc6ICdmMDVjJywgJ2NoZWNrLWNpcmNsZS1vJzogJ2YwNWQnLCAnYmFuJzogJ2YwNWUnLCAnYXJyb3ctbGVmdCc6ICdmMDYwJywgJ2Fycm93LXJpZ2h0JzogJ2YwNjEnLCAnYXJyb3ctdXAnOiAnZjA2MicsICdhcnJvdy1kb3duJzogJ2YwNjMnLCAnbWFpbC1mb3J3YXJkLHNoYXJlJzogJ2YwNjQnLCAnZXhwYW5kJzogJ2YwNjUnLCAnY29tcHJlc3MnOiAnZjA2NicsICdwbHVzJzogJ2YwNjcnLCAnbWludXMnOiAnZjA2OCcsICdhc3Rlcmlzayc6ICdmMDY5JywgJ2V4Y2xhbWF0aW9uLWNpcmNsZSc6ICdmMDZhJywgJ2dpZnQnOiAnZjA2YicsICdsZWFmJzogJ2YwNmMnLCAnZmlyZSc6ICdmMDZkJywgJ2V5ZSc6ICdmMDZlJywgJ2V5ZS1zbGFzaCc6ICdmMDcwJywgJ3dhcm5pbmcsZXhjbGFtYXRpb24tdHJpYW5nbGUnOiAnZjA3MScsICdwbGFuZSc6ICdmMDcyJywgJ2NhbGVuZGFyJzogJ2YwNzMnLCAncmFuZG9tJzogJ2YwNzQnLCAnY29tbWVudCc6ICdmMDc1JywgJ21hZ25ldCc6ICdmMDc2JywgJ2NoZXZyb24tdXAnOiAnZjA3NycsICdjaGV2cm9uLWRvd24nOiAnZjA3OCcsICdyZXR3ZWV0JzogJ2YwNzknLCAnc2hvcHBpbmctY2FydCc6ICdmMDdhJywgJ2ZvbGRlcic6ICdmMDdiJywgJ2ZvbGRlci1vcGVuJzogJ2YwN2MnLCAnYXJyb3dzLXYnOiAnZjA3ZCcsICdhcnJvd3MtaCc6ICdmMDdlJywgJ2Jhci1jaGFydC1vLGJhci1jaGFydCc6ICdmMDgwJywgJ3R3aXR0ZXItc3F1YXJlJzogJ2YwODEnLCAnZmFjZWJvb2stc3F1YXJlJzogJ2YwODInLCAnY2FtZXJhLXJldHJvJzogJ2YwODMnLCAna2V5JzogJ2YwODQnLCAnZ2VhcnMsY29ncyc6ICdmMDg1JywgJ2NvbW1lbnRzJzogJ2YwODYnLCAndGh1bWJzLW8tdXAnOiAnZjA4NycsICd0aHVtYnMtby1kb3duJzogJ2YwODgnLCAnc3Rhci1oYWxmJzogJ2YwODknLCAnaGVhcnQtbyc6ICdmMDhhJywgJ3NpZ24tb3V0JzogJ2YwOGInLCAnbGlua2VkaW4tc3F1YXJlJzogJ2YwOGMnLCAndGh1bWItdGFjayc6ICdmMDhkJywgJ2V4dGVybmFsLWxpbmsnOiAnZjA4ZScsICdzaWduLWluJzogJ2YwOTAnLCAndHJvcGh5JzogJ2YwOTEnLCAnZ2l0aHViLXNxdWFyZSc6ICdmMDkyJywgJ3VwbG9hZCc6ICdmMDkzJywgJ2xlbW9uLW8nOiAnZjA5NCcsICdwaG9uZSc6ICdmMDk1JywgJ3NxdWFyZS1vJzogJ2YwOTYnLCAnYm9va21hcmstbyc6ICdmMDk3JywgJ3Bob25lLXNxdWFyZSc6ICdmMDk4JywgJ3R3aXR0ZXInOiAnZjA5OScsICdmYWNlYm9vay1mLGZhY2Vib29rJzogJ2YwOWEnLCAnZ2l0aHViJzogJ2YwOWInLCAndW5sb2NrJzogJ2YwOWMnLCAnY3JlZGl0LWNhcmQnOiAnZjA5ZCcsICdmZWVkLHJzcyc6ICdmMDllJywgJ2hkZC1vJzogJ2YwYTAnLCAnYnVsbGhvcm4nOiAnZjBhMScsICdiZWxsJzogJ2YwZjMnLCAnY2VydGlmaWNhdGUnOiAnZjBhMycsICdoYW5kLW8tcmlnaHQnOiAnZjBhNCcsICdoYW5kLW8tbGVmdCc6ICdmMGE1JywgJ2hhbmQtby11cCc6ICdmMGE2JywgJ2hhbmQtby1kb3duJzogJ2YwYTcnLCAnYXJyb3ctY2lyY2xlLWxlZnQnOiAnZjBhOCcsICdhcnJvdy1jaXJjbGUtcmlnaHQnOiAnZjBhOScsICdhcnJvdy1jaXJjbGUtdXAnOiAnZjBhYScsICdhcnJvdy1jaXJjbGUtZG93bic6ICdmMGFiJywgJ2dsb2JlJzogJ2YwYWMnLCAnd3JlbmNoJzogJ2YwYWQnLCAndGFza3MnOiAnZjBhZScsICdmaWx0ZXInOiAnZjBiMCcsICdicmllZmNhc2UnOiAnZjBiMScsICdhcnJvd3MtYWx0JzogJ2YwYjInLCAnZ3JvdXAsdXNlcnMnOiAnZjBjMCcsICdjaGFpbixsaW5rJzogJ2YwYzEnLCAnY2xvdWQnOiAnZjBjMicsICdmbGFzayc6ICdmMGMzJywgJ2N1dCxzY2lzc29ycyc6ICdmMGM0JywgJ2NvcHksZmlsZXMtbyc6ICdmMGM1JywgJ3BhcGVyY2xpcCc6ICdmMGM2JywgJ3NhdmUsZmxvcHB5LW8nOiAnZjBjNycsICdzcXVhcmUnOiAnZjBjOCcsICduYXZpY29uLHJlb3JkZXIsYmFycyc6ICdmMGM5JywgJ2xpc3QtdWwnOiAnZjBjYScsICdsaXN0LW9sJzogJ2YwY2InLCAnc3RyaWtldGhyb3VnaCc6ICdmMGNjJywgJ3VuZGVybGluZSc6ICdmMGNkJywgJ3RhYmxlJzogJ2YwY2UnLCAnbWFnaWMnOiAnZjBkMCcsICd0cnVjayc6ICdmMGQxJywgJ3BpbnRlcmVzdCc6ICdmMGQyJywgJ3BpbnRlcmVzdC1zcXVhcmUnOiAnZjBkMycsICdnb29nbGUtcGx1cy1zcXVhcmUnOiAnZjBkNCcsICdnb29nbGUtcGx1cyc6ICdmMGQ1JywgJ21vbmV5JzogJ2YwZDYnLCAnY2FyZXQtZG93bic6ICdmMGQ3JywgJ2NhcmV0LXVwJzogJ2YwZDgnLCAnY2FyZXQtbGVmdCc6ICdmMGQ5JywgJ2NhcmV0LXJpZ2h0JzogJ2YwZGEnLCAnY29sdW1ucyc6ICdmMGRiJywgJ3Vuc29ydGVkLHNvcnQnOiAnZjBkYycsICdzb3J0LWRvd24sc29ydC1kZXNjJzogJ2YwZGQnLCAnc29ydC11cCxzb3J0LWFzYyc6ICdmMGRlJywgJ2VudmVsb3BlJzogJ2YwZTAnLCAnbGlua2VkaW4nOiAnZjBlMScsICdyb3RhdGUtbGVmdCx1bmRvJzogJ2YwZTInLCAnbGVnYWwsZ2F2ZWwnOiAnZjBlMycsICdkYXNoYm9hcmQsdGFjaG9tZXRlcic6ICdmMGU0JywgJ2NvbW1lbnQtbyc6ICdmMGU1JywgJ2NvbW1lbnRzLW8nOiAnZjBlNicsICdmbGFzaCxib2x0JzogJ2YwZTcnLCAnc2l0ZW1hcCc6ICdmMGU4JywgJ3VtYnJlbGxhJzogJ2YwZTknLCAncGFzdGUsY2xpcGJvYXJkJzogJ2YwZWEnLCAnbGlnaHRidWxiLW8nOiAnZjBlYicsICdleGNoYW5nZSc6ICdmMGVjJywgJ2Nsb3VkLWRvd25sb2FkJzogJ2YwZWQnLCAnY2xvdWQtdXBsb2FkJzogJ2YwZWUnLCAndXNlci1tZCc6ICdmMGYwJywgJ3N0ZXRob3Njb3BlJzogJ2YwZjEnLCAnc3VpdGNhc2UnOiAnZjBmMicsICdiZWxsLW8nOiAnZjBhMicsICdjb2ZmZWUnOiAnZjBmNCcsICdjdXRsZXJ5JzogJ2YwZjUnLCAnZmlsZS10ZXh0LW8nOiAnZjBmNicsICdidWlsZGluZy1vJzogJ2YwZjcnLCAnaG9zcGl0YWwtbyc6ICdmMGY4JywgJ2FtYnVsYW5jZSc6ICdmMGY5JywgJ21lZGtpdCc6ICdmMGZhJywgJ2ZpZ2h0ZXItamV0JzogJ2YwZmInLCAnYmVlcic6ICdmMGZjJywgJ2gtc3F1YXJlJzogJ2YwZmQnLCAncGx1cy1zcXVhcmUnOiAnZjBmZScsICdhbmdsZS1kb3VibGUtbGVmdCc6ICdmMTAwJywgJ2FuZ2xlLWRvdWJsZS1yaWdodCc6ICdmMTAxJywgJ2FuZ2xlLWRvdWJsZS11cCc6ICdmMTAyJywgJ2FuZ2xlLWRvdWJsZS1kb3duJzogJ2YxMDMnLCAnYW5nbGUtbGVmdCc6ICdmMTA0JywgJ2FuZ2xlLXJpZ2h0JzogJ2YxMDUnLCAnYW5nbGUtdXAnOiAnZjEwNicsICdhbmdsZS1kb3duJzogJ2YxMDcnLCAnZGVza3RvcCc6ICdmMTA4JywgJ2xhcHRvcCc6ICdmMTA5JywgJ3RhYmxldCc6ICdmMTBhJywgJ21vYmlsZS1waG9uZSxtb2JpbGUnOiAnZjEwYicsICdjaXJjbGUtbyc6ICdmMTBjJywgJ3F1b3RlLWxlZnQnOiAnZjEwZCcsICdxdW90ZS1yaWdodCc6ICdmMTBlJywgJ3NwaW5uZXInOiAnZjExMCcsICdjaXJjbGUnOiAnZjExMScsICdtYWlsLXJlcGx5LHJlcGx5JzogJ2YxMTInLCAnZ2l0aHViLWFsdCc6ICdmMTEzJywgJ2ZvbGRlci1vJzogJ2YxMTQnLCAnZm9sZGVyLW9wZW4tbyc6ICdmMTE1JywgJ3NtaWxlLW8nOiAnZjExOCcsICdmcm93bi1vJzogJ2YxMTknLCAnbWVoLW8nOiAnZjExYScsICdnYW1lcGFkJzogJ2YxMWInLCAna2V5Ym9hcmQtbyc6ICdmMTFjJywgJ2ZsYWctbyc6ICdmMTFkJywgJ2ZsYWctY2hlY2tlcmVkJzogJ2YxMWUnLCAndGVybWluYWwnOiAnZjEyMCcsICdjb2RlJzogJ2YxMjEnLCAnbWFpbC1yZXBseS1hbGwscmVwbHktYWxsJzogJ2YxMjInLCAnc3Rhci1oYWxmLWVtcHR5LHN0YXItaGFsZi1mdWxsLHN0YXItaGFsZi1vJzogJ2YxMjMnLCAnbG9jYXRpb24tYXJyb3cnOiAnZjEyNCcsICdjcm9wJzogJ2YxMjUnLCAnY29kZS1mb3JrJzogJ2YxMjYnLCAndW5saW5rLGNoYWluLWJyb2tlbic6ICdmMTI3JywgJ3F1ZXN0aW9uJzogJ2YxMjgnLCAnaW5mbyc6ICdmMTI5JywgJ2V4Y2xhbWF0aW9uJzogJ2YxMmEnLCAnc3VwZXJzY3JpcHQnOiAnZjEyYicsICdzdWJzY3JpcHQnOiAnZjEyYycsICdlcmFzZXInOiAnZjEyZCcsICdwdXp6bGUtcGllY2UnOiAnZjEyZScsICdtaWNyb3Bob25lJzogJ2YxMzAnLCAnbWljcm9waG9uZS1zbGFzaCc6ICdmMTMxJywgJ3NoaWVsZCc6ICdmMTMyJywgJ2NhbGVuZGFyLW8nOiAnZjEzMycsICdmaXJlLWV4dGluZ3Vpc2hlcic6ICdmMTM0JywgJ3JvY2tldCc6ICdmMTM1JywgJ21heGNkbic6ICdmMTM2JywgJ2NoZXZyb24tY2lyY2xlLWxlZnQnOiAnZjEzNycsICdjaGV2cm9uLWNpcmNsZS1yaWdodCc6ICdmMTM4JywgJ2NoZXZyb24tY2lyY2xlLXVwJzogJ2YxMzknLCAnY2hldnJvbi1jaXJjbGUtZG93bic6ICdmMTNhJywgJ2h0bWw1JzogJ2YxM2InLCAnY3NzMyc6ICdmMTNjJywgJ2FuY2hvcic6ICdmMTNkJywgJ3VubG9jay1hbHQnOiAnZjEzZScsICdidWxsc2V5ZSc6ICdmMTQwJywgJ2VsbGlwc2lzLWgnOiAnZjE0MScsICdlbGxpcHNpcy12JzogJ2YxNDInLCAncnNzLXNxdWFyZSc6ICdmMTQzJywgJ3BsYXktY2lyY2xlJzogJ2YxNDQnLCAndGlja2V0JzogJ2YxNDUnLCAnbWludXMtc3F1YXJlJzogJ2YxNDYnLCAnbWludXMtc3F1YXJlLW8nOiAnZjE0NycsICdsZXZlbC11cCc6ICdmMTQ4JywgJ2xldmVsLWRvd24nOiAnZjE0OScsICdjaGVjay1zcXVhcmUnOiAnZjE0YScsICdwZW5jaWwtc3F1YXJlJzogJ2YxNGInLCAnZXh0ZXJuYWwtbGluay1zcXVhcmUnOiAnZjE0YycsICdzaGFyZS1zcXVhcmUnOiAnZjE0ZCcsICdjb21wYXNzJzogJ2YxNGUnLCAndG9nZ2xlLWRvd24sY2FyZXQtc3F1YXJlLW8tZG93bic6ICdmMTUwJywgJ3RvZ2dsZS11cCxjYXJldC1zcXVhcmUtby11cCc6ICdmMTUxJywgJ3RvZ2dsZS1yaWdodCxjYXJldC1zcXVhcmUtby1yaWdodCc6ICdmMTUyJywgJ2V1cm8sZXVyJzogJ2YxNTMnLCAnZ2JwJzogJ2YxNTQnLCAnZG9sbGFyLHVzZCc6ICdmMTU1JywgJ3J1cGVlLGlucic6ICdmMTU2JywgJ2NueSxybWIseWVuLGpweSc6ICdmMTU3JywgJ3J1YmxlLHJvdWJsZSxydWInOiAnZjE1OCcsICd3b24sa3J3JzogJ2YxNTknLCAnYml0Y29pbixidGMnOiAnZjE1YScsICdmaWxlJzogJ2YxNWInLCAnZmlsZS10ZXh0JzogJ2YxNWMnLCAnc29ydC1hbHBoYS1hc2MnOiAnZjE1ZCcsICdzb3J0LWFscGhhLWRlc2MnOiAnZjE1ZScsICdzb3J0LWFtb3VudC1hc2MnOiAnZjE2MCcsICdzb3J0LWFtb3VudC1kZXNjJzogJ2YxNjEnLCAnc29ydC1udW1lcmljLWFzYyc6ICdmMTYyJywgJ3NvcnQtbnVtZXJpYy1kZXNjJzogJ2YxNjMnLCAndGh1bWJzLXVwJzogJ2YxNjQnLCAndGh1bWJzLWRvd24nOiAnZjE2NScsICd5b3V0dWJlLXNxdWFyZSc6ICdmMTY2JywgJ3lvdXR1YmUnOiAnZjE2NycsICd4aW5nJzogJ2YxNjgnLCAneGluZy1zcXVhcmUnOiAnZjE2OScsICd5b3V0dWJlLXBsYXknOiAnZjE2YScsICdkcm9wYm94JzogJ2YxNmInLCAnc3RhY2stb3ZlcmZsb3cnOiAnZjE2YycsICdpbnN0YWdyYW0nOiAnZjE2ZCcsICdmbGlja3InOiAnZjE2ZScsICdhZG4nOiAnZjE3MCcsICdiaXRidWNrZXQnOiAnZjE3MScsICdiaXRidWNrZXQtc3F1YXJlJzogJ2YxNzInLCAndHVtYmxyJzogJ2YxNzMnLCAndHVtYmxyLXNxdWFyZSc6ICdmMTc0JywgJ2xvbmctYXJyb3ctZG93bic6ICdmMTc1JywgJ2xvbmctYXJyb3ctdXAnOiAnZjE3NicsICdsb25nLWFycm93LWxlZnQnOiAnZjE3NycsICdsb25nLWFycm93LXJpZ2h0JzogJ2YxNzgnLCAnYXBwbGUnOiAnZjE3OScsICd3aW5kb3dzJzogJ2YxN2EnLCAnYW5kcm9pZCc6ICdmMTdiJywgJ2xpbnV4JzogJ2YxN2MnLCAnZHJpYmJibGUnOiAnZjE3ZCcsICdza3lwZSc6ICdmMTdlJywgJ2ZvdXJzcXVhcmUnOiAnZjE4MCcsICd0cmVsbG8nOiAnZjE4MScsICdmZW1hbGUnOiAnZjE4MicsICdtYWxlJzogJ2YxODMnLCAnZ2l0dGlwLGdyYXRpcGF5JzogJ2YxODQnLCAnc3VuLW8nOiAnZjE4NScsICdtb29uLW8nOiAnZjE4NicsICdhcmNoaXZlJzogJ2YxODcnLCAnYnVnJzogJ2YxODgnLCAndmsnOiAnZjE4OScsICd3ZWlibyc6ICdmMThhJywgJ3JlbnJlbic6ICdmMThiJywgJ3BhZ2VsaW5lcyc6ICdmMThjJywgJ3N0YWNrLWV4Y2hhbmdlJzogJ2YxOGQnLCAnYXJyb3ctY2lyY2xlLW8tcmlnaHQnOiAnZjE4ZScsICdhcnJvdy1jaXJjbGUtby1sZWZ0JzogJ2YxOTAnLCAndG9nZ2xlLWxlZnQsY2FyZXQtc3F1YXJlLW8tbGVmdCc6ICdmMTkxJywgJ2RvdC1jaXJjbGUtbyc6ICdmMTkyJywgJ3doZWVsY2hhaXInOiAnZjE5MycsICd2aW1lby1zcXVhcmUnOiAnZjE5NCcsICd0dXJraXNoLWxpcmEsdHJ5JzogJ2YxOTUnLCAncGx1cy1zcXVhcmUtbyc6ICdmMTk2JywgJ3NwYWNlLXNodXR0bGUnOiAnZjE5NycsICdzbGFjayc6ICdmMTk4JywgJ2VudmVsb3BlLXNxdWFyZSc6ICdmMTk5JywgJ3dvcmRwcmVzcyc6ICdmMTlhJywgJ29wZW5pZCc6ICdmMTliJywgJ2luc3RpdHV0aW9uLGJhbmssdW5pdmVyc2l0eSc6ICdmMTljJywgJ21vcnRhci1ib2FyZCxncmFkdWF0aW9uLWNhcCc6ICdmMTlkJywgJ3lhaG9vJzogJ2YxOWUnLCAnZ29vZ2xlJzogJ2YxYTAnLCAncmVkZGl0JzogJ2YxYTEnLCAncmVkZGl0LXNxdWFyZSc6ICdmMWEyJywgJ3N0dW1ibGV1cG9uLWNpcmNsZSc6ICdmMWEzJywgJ3N0dW1ibGV1cG9uJzogJ2YxYTQnLCAnZGVsaWNpb3VzJzogJ2YxYTUnLCAnZGlnZyc6ICdmMWE2JywgJ3BpZWQtcGlwZXItcHAnOiAnZjFhNycsICdwaWVkLXBpcGVyLWFsdCc6ICdmMWE4JywgJ2RydXBhbCc6ICdmMWE5JywgJ2pvb21sYSc6ICdmMWFhJywgJ2xhbmd1YWdlJzogJ2YxYWInLCAnZmF4JzogJ2YxYWMnLCAnYnVpbGRpbmcnOiAnZjFhZCcsICdjaGlsZCc6ICdmMWFlJywgJ3Bhdyc6ICdmMWIwJywgJ3Nwb29uJzogJ2YxYjEnLCAnY3ViZSc6ICdmMWIyJywgJ2N1YmVzJzogJ2YxYjMnLCAnYmVoYW5jZSc6ICdmMWI0JywgJ2JlaGFuY2Utc3F1YXJlJzogJ2YxYjUnLCAnc3RlYW0nOiAnZjFiNicsICdzdGVhbS1zcXVhcmUnOiAnZjFiNycsICdyZWN5Y2xlJzogJ2YxYjgnLCAnYXV0b21vYmlsZSxjYXInOiAnZjFiOScsICdjYWIsdGF4aSc6ICdmMWJhJywgJ3RyZWUnOiAnZjFiYicsICdzcG90aWZ5JzogJ2YxYmMnLCAnZGV2aWFudGFydCc6ICdmMWJkJywgJ3NvdW5kY2xvdWQnOiAnZjFiZScsICdkYXRhYmFzZSc6ICdmMWMwJywgJ2ZpbGUtcGRmLW8nOiAnZjFjMScsICdmaWxlLXdvcmQtbyc6ICdmMWMyJywgJ2ZpbGUtZXhjZWwtbyc6ICdmMWMzJywgJ2ZpbGUtcG93ZXJwb2ludC1vJzogJ2YxYzQnLCAnZmlsZS1waG90by1vLGZpbGUtcGljdHVyZS1vLGZpbGUtaW1hZ2Utbyc6ICdmMWM1JywgJ2ZpbGUtemlwLW8sZmlsZS1hcmNoaXZlLW8nOiAnZjFjNicsICdmaWxlLXNvdW5kLW8sZmlsZS1hdWRpby1vJzogJ2YxYzcnLCAnZmlsZS1tb3ZpZS1vLGZpbGUtdmlkZW8tbyc6ICdmMWM4JywgJ2ZpbGUtY29kZS1vJzogJ2YxYzknLCAndmluZSc6ICdmMWNhJywgJ2NvZGVwZW4nOiAnZjFjYicsICdqc2ZpZGRsZSc6ICdmMWNjJywgJ2xpZmUtYm91eSxsaWZlLWJ1b3ksbGlmZS1zYXZlcixzdXBwb3J0LGxpZmUtcmluZyc6ICdmMWNkJywgJ2NpcmNsZS1vLW5vdGNoJzogJ2YxY2UnLCAncmEscmVzaXN0YW5jZSxyZWJlbCc6ICdmMWQwJywgJ2dlLGVtcGlyZSc6ICdmMWQxJywgJ2dpdC1zcXVhcmUnOiAnZjFkMicsICdnaXQnOiAnZjFkMycsICd5LWNvbWJpbmF0b3Itc3F1YXJlLHljLXNxdWFyZSxoYWNrZXItbmV3cyc6ICdmMWQ0JywgJ3RlbmNlbnQtd2VpYm8nOiAnZjFkNScsICdxcSc6ICdmMWQ2JywgJ3dlY2hhdCx3ZWl4aW4nOiAnZjFkNycsICdzZW5kLHBhcGVyLXBsYW5lJzogJ2YxZDgnLCAnc2VuZC1vLHBhcGVyLXBsYW5lLW8nOiAnZjFkOScsICdoaXN0b3J5JzogJ2YxZGEnLCAnY2lyY2xlLXRoaW4nOiAnZjFkYicsICdoZWFkZXInOiAnZjFkYycsICdwYXJhZ3JhcGgnOiAnZjFkZCcsICdzbGlkZXJzJzogJ2YxZGUnLCAnc2hhcmUtYWx0JzogJ2YxZTAnLCAnc2hhcmUtYWx0LXNxdWFyZSc6ICdmMWUxJywgJ2JvbWInOiAnZjFlMicsICdzb2NjZXItYmFsbC1vLGZ1dGJvbC1vJzogJ2YxZTMnLCAndHR5JzogJ2YxZTQnLCAnYmlub2N1bGFycyc6ICdmMWU1JywgJ3BsdWcnOiAnZjFlNicsICdzbGlkZXNoYXJlJzogJ2YxZTcnLCAndHdpdGNoJzogJ2YxZTgnLCAneWVscCc6ICdmMWU5JywgJ25ld3NwYXBlci1vJzogJ2YxZWEnLCAnd2lmaSc6ICdmMWViJywgJ2NhbGN1bGF0b3InOiAnZjFlYycsICdwYXlwYWwnOiAnZjFlZCcsICdnb29nbGUtd2FsbGV0JzogJ2YxZWUnLCAnY2MtdmlzYSc6ICdmMWYwJywgJ2NjLW1hc3RlcmNhcmQnOiAnZjFmMScsICdjYy1kaXNjb3Zlcic6ICdmMWYyJywgJ2NjLWFtZXgnOiAnZjFmMycsICdjYy1wYXlwYWwnOiAnZjFmNCcsICdjYy1zdHJpcGUnOiAnZjFmNScsICdiZWxsLXNsYXNoJzogJ2YxZjYnLCAnYmVsbC1zbGFzaC1vJzogJ2YxZjcnLCAndHJhc2gnOiAnZjFmOCcsICdjb3B5cmlnaHQnOiAnZjFmOScsICdhdCc6ICdmMWZhJywgJ2V5ZWRyb3BwZXInOiAnZjFmYicsICdwYWludC1icnVzaCc6ICdmMWZjJywgJ2JpcnRoZGF5LWNha2UnOiAnZjFmZCcsICdhcmVhLWNoYXJ0JzogJ2YxZmUnLCAncGllLWNoYXJ0JzogJ2YyMDAnLCAnbGluZS1jaGFydCc6ICdmMjAxJywgJ2xhc3RmbSc6ICdmMjAyJywgJ2xhc3RmbS1zcXVhcmUnOiAnZjIwMycsICd0b2dnbGUtb2ZmJzogJ2YyMDQnLCAndG9nZ2xlLW9uJzogJ2YyMDUnLCAnYmljeWNsZSc6ICdmMjA2JywgJ2J1cyc6ICdmMjA3JywgJ2lveGhvc3QnOiAnZjIwOCcsICdhbmdlbGxpc3QnOiAnZjIwOScsICdjYyc6ICdmMjBhJywgJ3NoZWtlbCxzaGVxZWwsaWxzJzogJ2YyMGInLCAnbWVhbnBhdGgnOiAnZjIwYycsICdidXlzZWxsYWRzJzogJ2YyMGQnLCAnY29ubmVjdGRldmVsb3AnOiAnZjIwZScsICdkYXNoY3ViZSc6ICdmMjEwJywgJ2ZvcnVtYmVlJzogJ2YyMTEnLCAnbGVhbnB1Yic6ICdmMjEyJywgJ3NlbGxzeSc6ICdmMjEzJywgJ3NoaXJ0c2luYnVsayc6ICdmMjE0JywgJ3NpbXBseWJ1aWx0JzogJ2YyMTUnLCAnc2t5YXRsYXMnOiAnZjIxNicsICdjYXJ0LXBsdXMnOiAnZjIxNycsICdjYXJ0LWFycm93LWRvd24nOiAnZjIxOCcsICdkaWFtb25kJzogJ2YyMTknLCAnc2hpcCc6ICdmMjFhJywgJ3VzZXItc2VjcmV0JzogJ2YyMWInLCAnbW90b3JjeWNsZSc6ICdmMjFjJywgJ3N0cmVldC12aWV3JzogJ2YyMWQnLCAnaGVhcnRiZWF0JzogJ2YyMWUnLCAndmVudXMnOiAnZjIyMScsICdtYXJzJzogJ2YyMjInLCAnbWVyY3VyeSc6ICdmMjIzJywgJ2ludGVyc2V4LHRyYW5zZ2VuZGVyJzogJ2YyMjQnLCAndHJhbnNnZW5kZXItYWx0JzogJ2YyMjUnLCAndmVudXMtZG91YmxlJzogJ2YyMjYnLCAnbWFycy1kb3VibGUnOiAnZjIyNycsICd2ZW51cy1tYXJzJzogJ2YyMjgnLCAnbWFycy1zdHJva2UnOiAnZjIyOScsICdtYXJzLXN0cm9rZS12JzogJ2YyMmEnLCAnbWFycy1zdHJva2UtaCc6ICdmMjJiJywgJ25ldXRlcic6ICdmMjJjJywgJ2dlbmRlcmxlc3MnOiAnZjIyZCcsICdmYWNlYm9vay1vZmZpY2lhbCc6ICdmMjMwJywgJ3BpbnRlcmVzdC1wJzogJ2YyMzEnLCAnd2hhdHNhcHAnOiAnZjIzMicsICdzZXJ2ZXInOiAnZjIzMycsICd1c2VyLXBsdXMnOiAnZjIzNCcsICd1c2VyLXRpbWVzJzogJ2YyMzUnLCAnaG90ZWwsYmVkJzogJ2YyMzYnLCAndmlhY29pbic6ICdmMjM3JywgJ3RyYWluJzogJ2YyMzgnLCAnc3Vid2F5JzogJ2YyMzknLCAnbWVkaXVtJzogJ2YyM2EnLCAneWMseS1jb21iaW5hdG9yJzogJ2YyM2InLCAnb3B0aW4tbW9uc3Rlcic6ICdmMjNjJywgJ29wZW5jYXJ0JzogJ2YyM2QnLCAnZXhwZWRpdGVkc3NsJzogJ2YyM2UnLCAnYmF0dGVyeS00LGJhdHRlcnktZnVsbCc6ICdmMjQwJywgJ2JhdHRlcnktMyxiYXR0ZXJ5LXRocmVlLXF1YXJ0ZXJzJzogJ2YyNDEnLCAnYmF0dGVyeS0yLGJhdHRlcnktaGFsZic6ICdmMjQyJywgJ2JhdHRlcnktMSxiYXR0ZXJ5LXF1YXJ0ZXInOiAnZjI0MycsICdiYXR0ZXJ5LTAsYmF0dGVyeS1lbXB0eSc6ICdmMjQ0JywgJ21vdXNlLXBvaW50ZXInOiAnZjI0NScsICdpLWN1cnNvcic6ICdmMjQ2JywgJ29iamVjdC1ncm91cCc6ICdmMjQ3JywgJ29iamVjdC11bmdyb3VwJzogJ2YyNDgnLCAnc3RpY2t5LW5vdGUnOiAnZjI0OScsICdzdGlja3ktbm90ZS1vJzogJ2YyNGEnLCAnY2MtamNiJzogJ2YyNGInLCAnY2MtZGluZXJzLWNsdWInOiAnZjI0YycsICdjbG9uZSc6ICdmMjRkJywgJ2JhbGFuY2Utc2NhbGUnOiAnZjI0ZScsICdob3VyZ2xhc3Mtbyc6ICdmMjUwJywgJ2hvdXJnbGFzcy0xLGhvdXJnbGFzcy1zdGFydCc6ICdmMjUxJywgJ2hvdXJnbGFzcy0yLGhvdXJnbGFzcy1oYWxmJzogJ2YyNTInLCAnaG91cmdsYXNzLTMsaG91cmdsYXNzLWVuZCc6ICdmMjUzJywgJ2hvdXJnbGFzcyc6ICdmMjU0JywgJ2hhbmQtZ3JhYi1vLGhhbmQtcm9jay1vJzogJ2YyNTUnLCAnaGFuZC1zdG9wLW8saGFuZC1wYXBlci1vJzogJ2YyNTYnLCAnaGFuZC1zY2lzc29ycy1vJzogJ2YyNTcnLCAnaGFuZC1saXphcmQtbyc6ICdmMjU4JywgJ2hhbmQtc3BvY2stbyc6ICdmMjU5JywgJ2hhbmQtcG9pbnRlci1vJzogJ2YyNWEnLCAnaGFuZC1wZWFjZS1vJzogJ2YyNWInLCAndHJhZGVtYXJrJzogJ2YyNWMnLCAncmVnaXN0ZXJlZCc6ICdmMjVkJywgJ2NyZWF0aXZlLWNvbW1vbnMnOiAnZjI1ZScsICdnZyc6ICdmMjYwJywgJ2dnLWNpcmNsZSc6ICdmMjYxJywgJ3RyaXBhZHZpc29yJzogJ2YyNjInLCAnb2Rub2tsYXNzbmlraSc6ICdmMjYzJywgJ29kbm9rbGFzc25pa2ktc3F1YXJlJzogJ2YyNjQnLCAnZ2V0LXBvY2tldCc6ICdmMjY1JywgJ3dpa2lwZWRpYS13JzogJ2YyNjYnLCAnc2FmYXJpJzogJ2YyNjcnLCAnY2hyb21lJzogJ2YyNjgnLCAnZmlyZWZveCc6ICdmMjY5JywgJ29wZXJhJzogJ2YyNmEnLCAnaW50ZXJuZXQtZXhwbG9yZXInOiAnZjI2YicsICd0dix0ZWxldmlzaW9uJzogJ2YyNmMnLCAnY29udGFvJzogJ2YyNmQnLCAnNTAwcHgnOiAnZjI2ZScsICdhbWF6b24nOiAnZjI3MCcsICdjYWxlbmRhci1wbHVzLW8nOiAnZjI3MScsICdjYWxlbmRhci1taW51cy1vJzogJ2YyNzInLCAnY2FsZW5kYXItdGltZXMtbyc6ICdmMjczJywgJ2NhbGVuZGFyLWNoZWNrLW8nOiAnZjI3NCcsICdpbmR1c3RyeSc6ICdmMjc1JywgJ21hcC1waW4nOiAnZjI3NicsICdtYXAtc2lnbnMnOiAnZjI3NycsICdtYXAtbyc6ICdmMjc4JywgJ21hcCc6ICdmMjc5JywgJ2NvbW1lbnRpbmcnOiAnZjI3YScsICdjb21tZW50aW5nLW8nOiAnZjI3YicsICdob3V6eic6ICdmMjdjJywgJ3ZpbWVvJzogJ2YyN2QnLCAnYmxhY2stdGllJzogJ2YyN2UnLCAnZm9udGljb25zJzogJ2YyODAnLCAncmVkZGl0LWFsaWVuJzogJ2YyODEnLCAnZWRnZSc6ICdmMjgyJywgJ2NyZWRpdC1jYXJkLWFsdCc6ICdmMjgzJywgJ2NvZGllcGllJzogJ2YyODQnLCAnbW9keCc6ICdmMjg1JywgJ2ZvcnQtYXdlc29tZSc6ICdmMjg2JywgJ3VzYic6ICdmMjg3JywgJ3Byb2R1Y3QtaHVudCc6ICdmMjg4JywgJ21peGNsb3VkJzogJ2YyODknLCAnc2NyaWJkJzogJ2YyOGEnLCAncGF1c2UtY2lyY2xlJzogJ2YyOGInLCAncGF1c2UtY2lyY2xlLW8nOiAnZjI4YycsICdzdG9wLWNpcmNsZSc6ICdmMjhkJywgJ3N0b3AtY2lyY2xlLW8nOiAnZjI4ZScsICdzaG9wcGluZy1iYWcnOiAnZjI5MCcsICdzaG9wcGluZy1iYXNrZXQnOiAnZjI5MScsICdoYXNodGFnJzogJ2YyOTInLCAnYmx1ZXRvb3RoJzogJ2YyOTMnLCAnYmx1ZXRvb3RoLWInOiAnZjI5NCcsICdwZXJjZW50JzogJ2YyOTUnLCAnZ2l0bGFiJzogJ2YyOTYnLCAnd3BiZWdpbm5lcic6ICdmMjk3JywgJ3dwZm9ybXMnOiAnZjI5OCcsICdlbnZpcmEnOiAnZjI5OScsICd1bml2ZXJzYWwtYWNjZXNzJzogJ2YyOWEnLCAnd2hlZWxjaGFpci1hbHQnOiAnZjI5YicsICdxdWVzdGlvbi1jaXJjbGUtbyc6ICdmMjljJywgJ2JsaW5kJzogJ2YyOWQnLCAnYXVkaW8tZGVzY3JpcHRpb24nOiAnZjI5ZScsICd2b2x1bWUtY29udHJvbC1waG9uZSc6ICdmMmEwJywgJ2JyYWlsbGUnOiAnZjJhMScsICdhc3Npc3RpdmUtbGlzdGVuaW5nLXN5c3RlbXMnOiAnZjJhMicsICdhc2wtaW50ZXJwcmV0aW5nLGFtZXJpY2FuLXNpZ24tbGFuZ3VhZ2UtaW50ZXJwcmV0aW5nJzogJ2YyYTMnLCAnZGVhZm5lc3MsaGFyZC1vZi1oZWFyaW5nLGRlYWYnOiAnZjJhNCcsICdnbGlkZSc6ICdmMmE1JywgJ2dsaWRlLWcnOiAnZjJhNicsICdzaWduaW5nLHNpZ24tbGFuZ3VhZ2UnOiAnZjJhNycsICdsb3ctdmlzaW9uJzogJ2YyYTgnLCAndmlhZGVvJzogJ2YyYTknLCAndmlhZGVvLXNxdWFyZSc6ICdmMmFhJywgJ3NuYXBjaGF0JzogJ2YyYWInLCAnc25hcGNoYXQtZ2hvc3QnOiAnZjJhYycsICdzbmFwY2hhdC1zcXVhcmUnOiAnZjJhZCcsICdwaWVkLXBpcGVyJzogJ2YyYWUnLCAnZmlyc3Qtb3JkZXInOiAnZjJiMCcsICd5b2FzdCc6ICdmMmIxJywgJ3RoZW1laXNsZSc6ICdmMmIyJywgJ2dvb2dsZS1wbHVzLWNpcmNsZSxnb29nbGUtcGx1cy1vZmZpY2lhbCc6ICdmMmIzJywgJ2ZhLGZvbnQtYXdlc29tZSc6ICdmMmI0JyB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGljb24oZCkge1xyXG4gICAgICAgIHZhciBjb2RlO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pY29uTWFwICYmIG9wdGlvbnMuc2hvd0ljb25zICYmIG9wdGlvbnMuaWNvbnMpIHtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dICYmIG9wdGlvbnMuaWNvbk1hcFtvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV1dO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbk1hcFtkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbZC5sYWJlbHNbMF1dO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2RlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGltYWdlKGQpIHtcclxuICAgICAgICB2YXIgaSwgaW1hZ2VzRm9yTGFiZWwsIGltZywgaW1nTGV2ZWwsIGxhYmVsLCBsYWJlbFByb3BlcnR5VmFsdWUsIHByb3BlcnR5LCB2YWx1ZTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgIGltYWdlc0ZvckxhYmVsID0gb3B0aW9ucy5pbWFnZU1hcFtkLmxhYmVsc1swXV07XHJcblxyXG4gICAgICAgICAgICBpZiAoaW1hZ2VzRm9yTGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIGltZ0xldmVsID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW1hZ2VzRm9yTGFiZWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbFByb3BlcnR5VmFsdWUgPSBpbWFnZXNGb3JMYWJlbFtpXS5zcGxpdCgnfCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsYWJlbFByb3BlcnR5VmFsdWVbMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHkgPSBsYWJlbFByb3BlcnR5VmFsdWVbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBsYWJlbFByb3BlcnR5VmFsdWVbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZC5sYWJlbHNbMF0gPT09IGxhYmVsICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICghcHJvcGVydHkgfHwgZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoIXZhbHVlIHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gPT09IHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aCA+IGltZ0xldmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWcgPSBvcHRpb25zLmltYWdlc1tpbWFnZXNGb3JMYWJlbFtpXV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWdMZXZlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbWc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICAgICAgaW5pdEljb25NYXAoKTtcclxuXHJcbiAgICAgICAgbWVyZ2Uob3B0aW9ucywgX29wdGlvbnMpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pY29ucykge1xyXG4gICAgICAgICAgICBvcHRpb25zLnNob3dJY29ucyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW9wdGlvbnMubWluQ29sbGlzaW9uKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMubWluQ29sbGlzaW9uID0gb3B0aW9ucy5ub2RlUmFkaXVzICogMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluaXRJbWFnZU1hcCgpO1xyXG5cclxuICAgICAgICBzZWxlY3RvciA9IF9zZWxlY3RvcjtcclxuXHJcbiAgICAgICAgY29udGFpbmVyID0gZDMuc2VsZWN0KHNlbGVjdG9yKTtcclxuXHJcbiAgICAgICAgY29udGFpbmVyLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMnKVxyXG4gICAgICAgICAgICAuaHRtbCgnJyk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmluZm9QYW5lbCkge1xyXG4gICAgICAgICAgICBpbmZvID0gYXBwZW5kSW5mb1BhbmVsKGNvbnRhaW5lcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBlbmRHcmFwaChjb250YWluZXIpO1xyXG4gICAgICAgIHNpbXVsYXRpb24gPSBpbml0U2ltdWxhdGlvbigpO1xyXG4gICAgICAgIGlmIChvcHRpb25zLm5lbzRqRGF0YSkge1xyXG4gICAgICAgICAgICBsb2FkTmVvNGpEYXRhKG9wdGlvbnMubmVvNGpEYXRhKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgICAgIGxvYWROZW80akRhdGFGcm9tVXJsKG9wdGlvbnMubmVvNGpEYXRhVXJsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvcjogYm90aCBuZW80akRhdGEgYW5kIG5lbzRqRGF0YVVybCBhcmUgZW1wdHkhJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBzQ29weSA9IHJlbGF0aW9uc2hpcHMubWFwKGZ1bmN0aW9uIChhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBhKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0SWNvbk1hcCgpIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgdmFyIGtleXMgPSBrZXkuc3BsaXQoJywnKSxcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gb3B0aW9ucy5pY29uTWFwW2tleV07XHJcblxyXG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5pY29uTWFwW2tleV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdEltYWdlTWFwKCkge1xyXG4gICAgICAgIHZhciBrZXksIGtleXMsIHNlbGVjdG9yO1xyXG5cclxuICAgICAgICBmb3IgKGtleSBpbiBvcHRpb25zLmltYWdlcykge1xyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICAgICAga2V5cyA9IGtleS5zcGxpdCgnfCcpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0gPSBba2V5XTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXS5wdXNoKGtleSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdFNpbXVsYXRpb24oKSB7XHJcbiAgICAgICAgdmFyIHNpbXVsYXRpb24gPSBkMy5mb3JjZVNpbXVsYXRpb24oKVxyXG4gICAgICAgICAgICAuZm9yY2UoJ2NvbGxpZGUnLCBkMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm1pbkNvbGxpc2lvbjtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY2hhcmdlJywgZDMuZm9yY2VNYW55Qm9keSgpKVxyXG4gICAgICAgICAgICAuZm9yY2UoJ2xpbmsnLCBkMy5mb3JjZUxpbmsoKS5pZChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuaWQ7XHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAuZm9yY2UoJ2NlbnRlcicsIGQzLmZvcmNlQ2VudGVyKHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LmNsaWVudFdpZHRoIC8gMiwgc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IC8gMikpXHJcbiAgICAgICAgICAgIC5vbigndGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHRpY2soKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy56b29tRml0ICYmICFqdXN0TG9hZGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAganVzdExvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgem9vbUZpdCgyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBzaW11bGF0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWROZW80akRhdGEoKSB7XHJcbiAgICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGEob3B0aW9ucy5uZW80akRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWROZW80akRhdGFGcm9tVXJsKG5lbzRqRGF0YVVybCkge1xyXG4gICAgICAgIG5vZGVzID0gW107XHJcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IFtdO1xyXG5cclxuICAgICAgICBkMy5qc29uKG5lbzRqRGF0YVVybCwgZnVuY3Rpb24gKGVycm9yLCBkYXRhKSB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGEoZGF0YSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWVyZ2UodGFyZ2V0LCBzb3VyY2UpIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG5lbzRqRGF0YVRvRDNEYXRhKGRhdGEpIHtcclxuICAgICAgICB2YXIgZ3JhcGggPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmZvckVhY2goZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgubm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghY29udGFpbnMoZ3JhcGgubm9kZXMsIG5vZGUuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyYXBoLm5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmZvckVhY2goZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghY29udGFpbnMoZ3JhcGgucmVsYXRpb25zaGlwcywgcmVsYXRpb25zaGlwLmlkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXAuc291cmNlID0gcmVsYXRpb25zaGlwLnN0YXJ0Tm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVsYXRpb25zaGlwLnRhcmdldCA9IHJlbGF0aW9uc2hpcC5lbmROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5yZWxhdGlvbnNoaXBzLnB1c2gocmVsYXRpb25zaGlwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhLnNvdXJjZSA+IGIuc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYS5zb3VyY2UgPCBiLnNvdXJjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEudGFyZ2V0ID4gYi50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS50YXJnZXQgPCBiLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSAwICYmIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5zb3VyY2UgPT09IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpIC0gMV0uc291cmNlICYmIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS50YXJnZXQgPT09IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpIC0gMV0udGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS5saW5rbnVtICsgMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0ubGlua251bSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGdyYXBoO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZERhdGFUb05vZGVPdXR3YXJkKHNvdXJjZU5vZGUsIG5ld05vZGVzLCBuZXdSZWxhdGlvbnNoaXBzKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHMgPSBzaXplKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBsYWJlbHM6IG5ld05vZGVzW2ldLmxhYmVscyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld05vZGVzW2ldLnByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB4OiBzb3VyY2VOb2RlLngsXHJcbiAgICAgICAgICAgICAgICB5OiBzb3VyY2VOb2RlLnlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbWFwW25ld05vZGVzW2ldLmlkXSA9IG5vZGUuaWQ7XHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmV3UmVsYXRpb25zaGlwcy5sZW5ndGg7IGorKykge1xyXG5cclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMucmVsYXRpb25zaGlwcyArIDEgKyBqLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogbmV3UmVsYXRpb25zaGlwc1tqXS50eXBlLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBzb3VyY2VOb2RlLmlkLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBtYXBbbmV3UmVsYXRpb25zaGlwc1tqXS5lbmROb2RlXSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld1JlbGF0aW9uc2hpcHNbal0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlTm9kZS5pZCxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogbWFwW25ld1JlbGF0aW9uc2hpcHNbal0uZW5kTm9kZV0sXHJcbiAgICAgICAgICAgICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgalxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmREYXRhVG9Ob2RlSW53YXJkKHNvdXJjZU5vZGUsIG5ld05vZGVzLCBuZXdSZWxhdGlvbnNoaXBzKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHMgPSBzaXplKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBsYWJlbHM6IG5ld05vZGVzW2ldLmxhYmVscyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld05vZGVzW2ldLnByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB4OiBzb3VyY2VOb2RlLngsXHJcbiAgICAgICAgICAgICAgICB5OiBzb3VyY2VOb2RlLnlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbWFwW25ld05vZGVzW2ldLmlkXSA9IG5vZGUuaWQ7XHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuZXdSZWxhdGlvbnNoaXBzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgaixcclxuICAgICAgICAgICAgICAgIHR5cGU6IG5ld1JlbGF0aW9uc2hpcHNbal0udHlwZSxcclxuICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogbWFwW25ld1JlbGF0aW9uc2hpcHNbal0uc3RhcnROb2RlXSxcclxuICAgICAgICAgICAgICAgIGVuZE5vZGU6IHNvdXJjZU5vZGUuaWQudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld1JlbGF0aW9uc2hpcHNbal0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogbWFwW25ld1JlbGF0aW9uc2hpcHNbal0uc3RhcnROb2RlXSxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogc291cmNlTm9kZS5pZCxcclxuICAgICAgICAgICAgICAgIGxpbmtudW06IHMucmVsYXRpb25zaGlwcyArIDEgKyBqXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBkYXRhLnJlbGF0aW9uc2hpcHNbZGF0YS5yZWxhdGlvbnNoaXBzLmxlbmd0aF0gPSByZWxhdGlvbnNoaXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmFuZG9tRDNEYXRhKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSkge1xyXG4gICAgICAgIHZhciBkYXRhID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfSxcclxuICAgICAgICAgICAgaSxcclxuICAgICAgICAgICAgbGFiZWwsXHJcbiAgICAgICAgICAgIG5vZGUsXHJcbiAgICAgICAgICAgIG51bU5vZGVzID0gKG1heE5vZGVzVG9HZW5lcmF0ZSAqIE1hdGgucmFuZG9tKCkgPDwgMCkgKyAxLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHMgPSBzaXplKCk7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bU5vZGVzOyBpKyspIHtcclxuICAgICAgICAgICAgbGFiZWwgPSByYW5kb21MYWJlbCgpO1xyXG5cclxuICAgICAgICAgICAgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBsYWJlbHM6IFtsYWJlbF0sXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tOiBsYWJlbFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHg6IGQueCxcclxuICAgICAgICAgICAgICAgIHk6IGQueVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tkYXRhLm5vZGVzLmxlbmd0aF0gPSBub2RlO1xyXG5cclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMucmVsYXRpb25zaGlwcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogbGFiZWwudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogZC5pZCxcclxuICAgICAgICAgICAgICAgIGVuZE5vZGU6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICBmcm9tOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc291cmNlOiBkLmlkLFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgaVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBkYXRhLnJlbGF0aW9uc2hpcHNbZGF0YS5yZWxhdGlvbnNoaXBzLmxlbmd0aF0gPSByZWxhdGlvbnNoaXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJhbmRvbUxhYmVsKCkge1xyXG4gICAgICAgIHZhciBpY29ucyA9IE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbk1hcCk7XHJcbiAgICAgICAgcmV0dXJuIGljb25zW2ljb25zLmxlbmd0aCAqIE1hdGgucmFuZG9tKCkgPDwgMF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlKGN4LCBjeSwgeCwgeSwgYW5nbGUpIHtcclxuICAgICAgICB2YXIgcmFkaWFucyA9IChNYXRoLlBJIC8gMTgwKSAqIGFuZ2xlLFxyXG4gICAgICAgICAgICBjb3MgPSBNYXRoLmNvcyhyYWRpYW5zKSxcclxuICAgICAgICAgICAgc2luID0gTWF0aC5zaW4ocmFkaWFucyksXHJcbiAgICAgICAgICAgIG54ID0gKGNvcyAqICh4IC0gY3gpKSArIChzaW4gKiAoeSAtIGN5KSkgKyBjeCxcclxuICAgICAgICAgICAgbnkgPSAoY29zICogKHkgLSBjeSkpIC0gKHNpbiAqICh4IC0gY3gpKSArIGN5O1xyXG5cclxuICAgICAgICByZXR1cm4geyB4OiBueCwgeTogbnkgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGVQb2ludChjLCBwLCBhbmdsZSkge1xyXG4gICAgICAgIHJldHVybiByb3RhdGUoYy54LCBjLnksIHAueCwgcC55LCBhbmdsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRpb24oc291cmNlLCB0YXJnZXQpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0YXJnZXQueSAtIHNvdXJjZS55LCB0YXJnZXQueCAtIHNvdXJjZS54KSAqIDE4MCAvIE1hdGguUEk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2l6ZSgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBub2Rlczogbm9kZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiByZWxhdGlvbnNoaXBzLmxlbmd0aFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICAvKlxyXG4gICAgICAgIGZ1bmN0aW9uIHNtb290aFRyYW5zZm9ybShlbGVtLCB0cmFuc2xhdGUsIHNjYWxlKSB7XHJcbiAgICAgICAgICAgIHZhciBhbmltYXRpb25NaWxsaXNlY29uZHMgPSA1MDAwLFxyXG4gICAgICAgICAgICAgICAgdGltZW91dE1pbGxpc2Vjb25kcyA9IDUwLFxyXG4gICAgICAgICAgICAgICAgc3RlcHMgPSBwYXJzZUludChhbmltYXRpb25NaWxsaXNlY29uZHMgLyB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuICAgIFxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCAxLCBzdGVwcyk7XHJcbiAgICAgICAgICAgIH0sIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgc3RlcCwgc3RlcHMpIHtcclxuICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gc3RlcCAvIHN0ZXBzO1xyXG4gICAgXHJcbiAgICAgICAgICAgIGVsZW0uYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKHRyYW5zbGF0ZVswXSAqIHByb2dyZXNzKSArICcsICcgKyAodHJhbnNsYXRlWzFdICogcHJvZ3Jlc3MpICsgJykgc2NhbGUoJyArIChzY2FsZSAqIHByb2dyZXNzKSArICcpJyk7XHJcbiAgICBcclxuICAgICAgICAgICAgaWYgKHN0ZXAgPCBzdGVwcykge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIHN0ZXAgKyAxLCBzdGVwcyk7XHJcbiAgICAgICAgICAgICAgICB9LCB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICovXHJcbiAgICBmdW5jdGlvbiBzdGlja05vZGUoZCkge1xyXG4gICAgICAgIGQuZnggPSBkMy5ldmVudC54O1xyXG4gICAgICAgIGQuZnkgPSBkMy5ldmVudC55O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2soKSB7XHJcbiAgICAgICAgdGlja05vZGVzKCk7XHJcbiAgICAgICAgdGlja1JlbGF0aW9uc2hpcHMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrTm9kZXMoKSB7XHJcbiAgICAgICAgaWYgKG5vZGUpIHtcclxuICAgICAgICAgICAgbm9kZS5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQueCArICcsICcgKyBkLnkgKyAnKSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwcygpIHtcclxuICAgICAgICBpZiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnNvdXJjZS54ICsgJywgJyArIGQuc291cmNlLnkgKyAnKSByb3RhdGUoJyArIGFuZ2xlICsgJyknO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzVGV4dHMoKTtcclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNPdXRsaW5lcygpO1xyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc092ZXJsYXlzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKSB7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgcmVsID0gZDMuc2VsZWN0KHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgb3V0bGluZSA9IHJlbC5zZWxlY3QoJy5vdXRsaW5lJyksXHJcbiAgICAgICAgICAgICAgICB0ZXh0ID0gcmVsLnNlbGVjdCgnLnRleHQnKTtcclxuXHJcbiAgICAgICAgICAgIG91dGxpbmUuYXR0cignZCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRCb3VuZGluZ0JveCA9IHRleHQubm9kZSgpLmdldEJCb3goKSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0UGFkZGluZyA9IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgdSA9IHVuaXRhcnlWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0TWFyZ2luID0geyB4OiAoZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAodGV4dEJvdW5kaW5nQm94LndpZHRoICsgdGV4dFBhZGRpbmcpICogdS54KSAqIDAuNSwgeTogKGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueSkgKiAwLjUgfSxcclxuICAgICAgICAgICAgICAgICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEExID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEIxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IHRleHRNYXJnaW4ueCAtIG4ueCwgeTogdGV4dE1hcmdpbi55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRDMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLngsIHk6IHRleHRNYXJnaW4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RDEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCwgeTogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gdGV4dE1hcmdpbi55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRDMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCArIChuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55ICsgKG4ueSAtIHUueSkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RDIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRFMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCArICgtIG4ueCAtIHUueCkgKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgKyAoLSBuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEYyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gdS54ICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gdS55ICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEcyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSB9LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBMS54ICsgJyAnICsgcm90YXRlZFBvaW50QTEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMS54ICsgJyAnICsgcm90YXRlZFBvaW50QjEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMS54ICsgJyAnICsgcm90YXRlZFBvaW50QzEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMS54ICsgJyAnICsgcm90YXRlZFBvaW50RDEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBaIE0gJyArIHJvdGF0ZWRQb2ludEEyLnggKyAnICcgKyByb3RhdGVkUG9pbnRBMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIyLnggKyAnICcgKyByb3RhdGVkUG9pbnRCMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMyLnggKyAnICcgKyByb3RhdGVkUG9pbnRDMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQyLnggKyAnICcgKyByb3RhdGVkUG9pbnREMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEUyLnggKyAnICcgKyByb3RhdGVkUG9pbnRFMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEYyLnggKyAnICcgKyByb3RhdGVkUG9pbnRGMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEcyLnggKyAnICcgKyByb3RhdGVkUG9pbnRHMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAnIFonO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBleHBhbmROb2RlKGN1cnJlbnROb2RlKSB7XHJcblxyXG4gICAgICAgIHZhciBkYXRhID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHMgPSBzaXplKCk7XHJcblxyXG4gICAgICAgIGN1cnJlbnROb2RlLnByZXZpb3VzLmZvckVhY2goZnVuY3Rpb24gKG4sIGkpIHtcclxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBub2RlXHJcbiAgICAgICAgICAgIHZhciBub2RlID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IG4ubm9kZS5pZCxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogbi5ub2RlLmxhYmVscyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG4ubm9kZS5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgeDogY3VycmVudE5vZGUueCxcclxuICAgICAgICAgICAgICAgIHk6IGN1cnJlbnROb2RlLnlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tkYXRhLm5vZGVzLmxlbmd0aF0gPSBub2RlO1xyXG5cclxuICAgICAgICAgICAgLy8gQ3JlYXRlIGxpbmsgZnJvbSBuZXcgbm9kZSB0byBpdHMgcGFyZW50XHJcbiAgICAgICAgICAgIGRhdGEucmVsYXRpb25zaGlwc1tkYXRhLnJlbGF0aW9uc2hpcHMubGVuZ3RoXSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBuLmxpbmsuaWQsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBuLmxpbmsudHlwZSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG4ubGluay5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBub2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogY3VycmVudE5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IG5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGN1cnJlbnROb2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmQgb3JpZ2luYWwgbGlua3MgXHJcblxyXG4gICAgICAgICAgICB2YXIgbGlua3MgPSByZWxhdGlvbnNoaXBzQ29weS5maWx0ZXIoZnVuY3Rpb24gKGxpbmspIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsaW5rLnNvdXJjZS5pZCA9PT0gbm9kZS5pZCB8fCBsaW5rLnRhcmdldC5pZCA9PT0gbm9kZS5pZDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBHZXQgbGlua3Mgb2YgdGhlIHBhcmVudCBub2RlXHJcbiAgICAgICAgICAgIHZhciBwYXJlbnRMaW5rcyA9IHJlbGF0aW9uc2hpcHMuZmlsdGVyKGZ1bmN0aW9uIChsaW5rKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluay5zb3VyY2UgPT09IGN1cnJlbnROb2RlIHx8IGxpbmsudGFyZ2V0ID09PSBjdXJyZW50Tm9kZTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxpbmtzIHRvIHRoZSBuZXdseSBjcmVhdGVkIG5vZGVcclxuICAgICAgICAgICAgbGlua3MuZm9yRWFjaChmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudExpbmsgPSBwYXJlbnRMaW5rcy5maW5kKGZ1bmN0aW9uIChwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHAuaWQgPT09IGxpbmsuaWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50TGluaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5rLnNvdXJjZS5pZCA9PT0gbm9kZS5pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRMaW5rLnNvdXJjZSA9IG5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50TGluay50YXJnZXQgPSBub2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN1cnJlbnROb2RlLmNvbGxhcHNlZCA9IGZhbHNlO1xyXG4gICAgICAgIGN1cnJlbnROb2RlLnByZXZpb3VzID0gW107XHJcblxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29sbGFwc2VOb2RlKG5vZGUsIHJ1bGVzKSB7XHJcbiAgICAgICAgaWYgKCFydWxlc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbGlua3MgPSByZWxhdGlvbnNoaXBzLmZpbHRlcihmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICByZXR1cm4gbGluay5zb3VyY2UgPT09IG5vZGUgfHwgbGluay50YXJnZXQgPT09IG5vZGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciBwYXJlbnRMaW5rID0gbGlua3MuZmluZChmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICByZXR1cm4gcnVsZXMubGluayA9PT0gbGluay50eXBlLnRvTG93ZXJDYXNlKCkgJiYgbGluay50YXJnZXQubGFiZWxzWzBdID09PSBydWxlc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcGFyZW50TGluay50YXJnZXQuY29sbGFwc2VkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGlua3Muc3BsaWNlKGxpbmtzLmluZGV4T2YocGFyZW50TGluayksIDEpO1xyXG5cclxuICAgICAgICBpZiAoIXBhcmVudExpbmsudGFyZ2V0LnByZXZpb3VzKSB7XHJcbiAgICAgICAgICAgIHBhcmVudExpbmsudGFyZ2V0LnByZXZpb3VzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJlbnRMaW5rLnRhcmdldC5wcmV2aW91cy5wdXNoKHtcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgbGluazogcGFyZW50TGlua1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsaW5rcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5rKSB7XHJcbiAgICAgICAgICAgIGxpbmsuY29sbGFwc2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKGxpbmsuc291cmNlID09PSBub2RlKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5rLnNvdXJjZSA9IHBhcmVudExpbmsudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgbGluay5zdGFydE5vZGUgPSBwYXJlbnRMaW5rLnRhcmdldC5pZDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxpbmsudGFyZ2V0ID0gcGFyZW50TGluay50YXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBsaW5rLmVuZE5vZGUgPSBwYXJlbnRMaW5rLnRhcmdldC5pZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZW1vdmVOb2RlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzT3ZlcmxheXMoKSB7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3ZlcmxheS5hdHRyKCdkJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgbjEgPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQsIDUwKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCAtIG4ueCwgeTogMCAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRDID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54ICsgbi54IC0gbjEueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgKyBuLnkgLSBuMS55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCArIG4ueCAtIG4xLngsIHk6IDAgKyBuLnkgLSBuMS55IH0sIGFuZ2xlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QS54ICsgJyAnICsgcm90YXRlZFBvaW50QS55ICtcclxuICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50Qi54ICsgJyAnICsgcm90YXRlZFBvaW50Qi55ICtcclxuICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50Qy54ICsgJyAnICsgcm90YXRlZFBvaW50Qy55ICtcclxuICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RC54ICsgJyAnICsgcm90YXRlZFBvaW50RC55ICtcclxuICAgICAgICAgICAgICAgICcgWic7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNUZXh0cygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0LmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgIHZhciBhbmdsZSA9IChyb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpICsgMzYwKSAlIDM2MCxcclxuICAgICAgICAgICAgICAgIG1pcnJvciA9IGFuZ2xlID4gOTAgJiYgYW5nbGUgPCAyNzAsXHJcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuV2VpZ2h0ID0gbWlycm9yID8gMiA6IC0zLFxyXG4gICAgICAgICAgICAgICAgcG9pbnQgPSB7IHg6IChkLnRhcmdldC54IC0gZC5zb3VyY2UueCkgKiAwLjUgKyBuLnggKiBuV2VpZ2h0LCB5OiAoZC50YXJnZXQueSAtIGQuc291cmNlLnkpICogMC41ICsgbi55ICogbldlaWdodCB9LFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50ID0gcm90YXRlUG9pbnQoY2VudGVyLCBwb2ludCwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHJvdGF0ZWRQb2ludC54ICsgJywgJyArIHJvdGF0ZWRQb2ludC55ICsgJykgcm90YXRlKCcgKyAobWlycm9yID8gMTgwIDogMCkgKyAnKSc7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcoZCkge1xyXG4gICAgICAgIHZhciBzID0gZC5sYWJlbHMgPyBkLmxhYmVsc1swXSA6IGQudHlwZTtcclxuXHJcbiAgICAgICAgcyArPSAnICg8aWQ+OiAnICsgZC5pZDtcclxuXHJcbiAgICAgICAgT2JqZWN0LmtleXMoZC5wcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICBzICs9ICcsICcgKyBwcm9wZXJ0eSArICc6ICcgKyBKU09OLnN0cmluZ2lmeShkLnByb3BlcnRpZXNbcHJvcGVydHldKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcyArPSAnKSc7XHJcblxyXG4gICAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVuaXRhcnlOb3JtYWxWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCkge1xyXG4gICAgICAgIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICAgICAgdmVjdG9yID0gdW5pdGFyeVZlY3Rvcihzb3VyY2UsIHRhcmdldCwgbmV3TGVuZ3RoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJvdGF0ZVBvaW50KGNlbnRlciwgdmVjdG9yLCA5MCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdW5pdGFyeVZlY3Rvcihzb3VyY2UsIHRhcmdldCwgbmV3TGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydChNYXRoLnBvdyh0YXJnZXQueCAtIHNvdXJjZS54LCAyKSArIE1hdGgucG93KHRhcmdldC55IC0gc291cmNlLnksIDIpKSAvIE1hdGguc3FydChuZXdMZW5ndGggfHwgMSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6ICh0YXJnZXQueCAtIHNvdXJjZS54KSAvIGxlbmd0aCxcclxuICAgICAgICAgICAgeTogKHRhcmdldC55IC0gc291cmNlLnkpIC8gbGVuZ3RoLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlV2l0aEQzRGF0YShkM0RhdGEpIHtcclxuICAgICAgICB1cGRhdGVOb2Rlc0FuZFJlbGF0aW9uc2hpcHMoZDNEYXRhLm5vZGVzLCBkM0RhdGEucmVsYXRpb25zaGlwcywgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlV2l0aE5lbzRqRGF0YShuZW80akRhdGEpIHtcclxuICAgICAgICB2YXIgZDNEYXRhID0gbmVvNGpEYXRhVG9EM0RhdGEobmVvNGpEYXRhKTtcclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlSW5mbyhkKSB7XHJcbiAgICAgICAgY2xlYXJJbmZvKCk7XHJcblxyXG4gICAgICAgIGlmIChkLmxhYmVscykge1xyXG4gICAgICAgICAgICBhcHBlbmRJbmZvRWxlbWVudENsYXNzKCdjbGFzcycsIGQubGFiZWxzWzBdKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFJlbGF0aW9uc2hpcCgnY2xhc3MnLCBkLnR5cGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eSgncHJvcGVydHknLCAnJmx0O2lkJmd0OycsIGQuaWQpO1xyXG5cclxuICAgICAgICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50UHJvcGVydHkoJ3Byb3BlcnR5JywgcHJvcGVydHksIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVOb2RlcyhuLCBhcHBlbmQpIHtcclxuICAgICAgICBpZiAoYXBwZW5kKSB7XHJcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG5vZGVzLCBuKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5vZGUgPSBzdmdOb2Rlcy5zZWxlY3RBbGwoJy5ub2RlJylcclxuICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuICAgICAgICB2YXIgbm9kZUVudGVyID0gYXBwZW5kTm9kZVRvR3JhcGgoKTtcclxuICAgICAgICBub2RlID0gbm9kZUVudGVyLm1lcmdlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhuLCByLCBhcHBlbmQpIHtcclxuICAgICAgICB1cGRhdGVSZWxhdGlvbnNoaXBzKHIsIGFwcGVuZCk7XHJcbiAgICAgICAgdXBkYXRlTm9kZXMobiwgYXBwZW5kKTtcclxuXHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVJlbGF0aW9uc2hpcHMociwgYXBwZW5kKSB7XHJcbiAgICAgICAgaWYgKGFwcGVuZCkge1xyXG4gICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShyZWxhdGlvbnNoaXBzLCByKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcCA9IHN2Z1JlbGF0aW9uc2hpcHMuc2VsZWN0QWxsKCcucmVsYXRpb25zaGlwJylcclxuICAgICAgICAgICAgLmRhdGEocmVsYXRpb25zaGlwcywgZnVuY3Rpb24gKGQpIHsgcmV0dXJuIGQuaWQ7IH0pO1xyXG5cclxuICAgICAgICB2YXIgcmVsYXRpb25zaGlwRW50ZXIgPSBhcHBlbmRSZWxhdGlvbnNoaXBUb0dyYXBoKCk7XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcCA9IHJlbGF0aW9uc2hpcEVudGVyLnJlbGF0aW9uc2hpcC5tZXJnZShyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBPdXRsaW5lID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3V0bGluZScpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE91dGxpbmUgPSByZWxhdGlvbnNoaXBFbnRlci5vdXRsaW5lLm1lcmdlKHJlbGF0aW9uc2hpcE91dGxpbmUpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3ZlcmxheScpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE92ZXJsYXkgPSByZWxhdGlvbnNoaXBFbnRlci5vdmVybGF5Lm1lcmdlKHJlbGF0aW9uc2hpcE92ZXJsYXkpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAudGV4dCcpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQgPSByZWxhdGlvbnNoaXBFbnRlci50ZXh0Lm1lcmdlKHJlbGF0aW9uc2hpcFRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHZlcnNpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gem9vbUZpdCh0cmFuc2l0aW9uRHVyYXRpb24pIHtcclxuICAgICAgICB2YXIgYm91bmRzID0gc3ZnLm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgIHBhcmVudCA9IHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LFxyXG4gICAgICAgICAgICBmdWxsV2lkdGggPSBwYXJlbnQuY2xpZW50V2lkdGgsXHJcbiAgICAgICAgICAgIGZ1bGxIZWlnaHQgPSBwYXJlbnQuY2xpZW50SGVpZ2h0LFxyXG4gICAgICAgICAgICB3aWR0aCA9IGJvdW5kcy53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0ID0gYm91bmRzLmhlaWdodCxcclxuICAgICAgICAgICAgbWlkWCA9IGJvdW5kcy54ICsgd2lkdGggLyAyLFxyXG4gICAgICAgICAgICBtaWRZID0gYm91bmRzLnkgKyBoZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICBpZiAod2lkdGggPT09IDAgfHwgaGVpZ2h0ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm90aGluZyB0byBmaXRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN2Z1NjYWxlID0gMC44NSAvIE1hdGgubWF4KHdpZHRoIC8gZnVsbFdpZHRoLCBoZWlnaHQgLyBmdWxsSGVpZ2h0KTtcclxuICAgICAgICBzdmdUcmFuc2xhdGUgPSBbZnVsbFdpZHRoIC8gMiAtIHN2Z1NjYWxlICogbWlkWCwgZnVsbEhlaWdodCAvIDIgLSBzdmdTY2FsZSAqIG1pZFldO1xyXG5cclxuICAgICAgICBzdmcuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgc3ZnVHJhbnNsYXRlWzBdICsgJywgJyArIHN2Z1RyYW5zbGF0ZVsxXSArICcpIHNjYWxlKCcgKyBzdmdTY2FsZSArICcpJyk7XHJcbiAgICAgICAgLy8gICAgICAgIHNtb290aFRyYW5zZm9ybShzdmdUcmFuc2xhdGUsIHN2Z1NjYWxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZXNldFdpdGhOZW80akRhdGEobmVvNGpEYXRhKSB7XHJcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKF9vcHRpb25zLCB7IG5lbzRqRGF0YTogbmVvNGpEYXRhLCBuZW80akRhdGFVcmw6IHVuZGVmaW5lZCB9KTtcclxuICAgICAgICBpbml0KF9zZWxlY3RvciwgbmV3T3B0aW9ucyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9kZShzb3VyY2VOb2RlKSB7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IHJlbGF0aW9uc2hpcHMuZmlsdGVyKGZ1bmN0aW9uIChyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICAgICAgaWYgKHJlbGF0aW9uc2hpcC5zb3VyY2UgPT09IHNvdXJjZU5vZGUgfHwgcmVsYXRpb25zaGlwLnRhcmdldCA9PT0gc291cmNlTm9kZSkge1xyXG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KFwiI1wiICsgcmVsYXRpb25zaGlwLnV1aWQpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBub2RlcyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZSAhPT0gc291cmNlTm9kZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZDMuc2VsZWN0KFwiI1wiICsgc291cmNlTm9kZS51dWlkKS5yZW1vdmUoKTtcclxuICAgICAgICB1cGRhdGVOb2Rlc0FuZFJlbGF0aW9uc2hpcHMobm9kZXMsIHJlbGF0aW9uc2hpcHMsIGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBndWlkKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIHM0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcclxuICAgICAgICAgICAgICAgIC50b1N0cmluZygxNilcclxuICAgICAgICAgICAgICAgIC5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAnZycgKyBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KF9zZWxlY3RvciwgX29wdGlvbnMpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWF0ZVZpZXdzKGtleXMpIHtcclxuICAgICAgICBkMy5zZWxlY3RBbGwoXCIudmlld3NcIikucmVtb3ZlKCk7XHJcbiAgICAgICAgdmFyIGNpcmNsZXMgPSBkMy5zZWxlY3QoJ3N2ZycpLnNlbGVjdEFsbCgncmVjdC52aWV3cycpLmRhdGEoa2V5cyk7XHJcbiAgICAgICAgdmFyIHIgPSAyMDtcclxuICAgICAgICBjaXJjbGVzLmVudGVyKCkuYXBwZW5kKCdyZWN0JykuY2xhc3NlZCgndmlld3MnLCB0cnVlKVxyXG4gICAgICAgICAgICAuYXR0cigneCcsIHIpXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAoa2V5cy5pbmRleE9mKG5vZGUpICsgMSkgKiAyLjIgKiByICsgMjc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdyeCcsIHIgLyAzKVxyXG4gICAgICAgICAgICAuYXR0cigncngnLCByIC8gMylcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgciAqIDQpXHJcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCByKVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsIGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sb3JzKClba2V5cy5pbmRleE9mKG5vZGUpICsgMV07XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiIzAwMDAwMFwiO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignc3Ryb2tlLXdpZHRoJywgZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIjAuNXB4XCI7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIFwicG9pbnRlclwiKVxyXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzQ2xpY2tIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzQ2xpY2tIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c01vdXNlT3ZlckhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NNb3VzZU92ZXJIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c01vdXNlTGVhdmVIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzTW91c2VMZWF2ZUhhbmRsZXIobik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgdGV4dCA9IGQzLnNlbGVjdCgnc3ZnJykuc2VsZWN0QWxsKCd0ZXh0LnZpZXdzJykuZGF0YShrZXlzKTtcclxuICAgICAgICB0ZXh0LmVudGVyKCkuYXBwZW5kKCd0ZXh0JykuY2xhc3NlZCgndmlld3MnLCB0cnVlKVxyXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbGVmdCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsICdib2xkJylcclxuICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZS13aWR0aCcsICcwJylcclxuICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZS1jb2xvcicsICd3aGl0ZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyM2OTY5NjknKVxyXG4gICAgICAgICAgICAuYXR0cigneCcsIDIgKiByKVxyXG4gICAgICAgICAgICAuYXR0cignZm9udC1zaXplJywgXCIxMHB4XCIpXHJcbiAgICAgICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIFwicG9pbnRlclwiKVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgICAgIH0pLmF0dHIoJ3knLCBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChrZXlzLmluZGV4T2Yobm9kZSkgKyAxKSAqIDIuMiAqIHIgKyA0MDtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c0NsaWNrSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25WaWV3c0NsaWNrSGFuZGxlcihuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAobikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uVmlld3NNb3VzZU92ZXJIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzTW91c2VPdmVySGFuZGxlcihuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzTW91c2VMZWF2ZUhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NNb3VzZUxlYXZlSGFuZGxlcihuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNpcmNsZXMuZXhpdCgpLnJlbW92ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGhpZ2hsaWdodE5vZGVzKG5vZGVzKSB7XHJcbiAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICBkMy5zZWxlY3QoXCIjXCIgKyBub2RlLnV1aWQpXHJcbiAgICAgICAgICAgICAgICAuY2xhc3NlZCgnbm9kZS1oaWdobGlnaHRlZCcsIHRydWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVuSGlnaGxpZ2h0Tm9kZXMobm9kZXMpIHtcclxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIGQzLnNlbGVjdChcIiNcIiArIG5vZGUudXVpZClcclxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdub2RlLWhpZ2hsaWdodGVkJywgZmFsc2UpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9yaWVudEZvcmNlR3JhcGhWZXJ0aWNhbChwcmlvcml0aWVzKSB7XHJcbiAgICAgICAgbm9kZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICByZXR1cm4gcHJpb3JpdGllc1thLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSAtIHByaW9yaXRpZXNbYi5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciBwcmlvcml0eSA9IDA7XHJcbiAgICAgICAgdmFyIHggPSA3MDA7XHJcbiAgICAgICAgdmFyIHkgPSAyMDA7XHJcblxyXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHByaW9yaXRpZXNbbm9kZS5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV0gIT09IHByaW9yaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBwcmlvcml0eSA9IHByaW9yaXRpZXNbbm9kZS5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV07XHJcbiAgICAgICAgICAgICAgICB5ICs9IDEzMDtcclxuICAgICAgICAgICAgICAgIHggPSA3MDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeCArPSAxNTA7XHJcblxyXG4gICAgICAgICAgICBub2RlLmZ4ID0geDtcclxuICAgICAgICAgICAgbm9kZS5meSA9IHk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb3JpZW50Rm9yY2VHcmFwaEhvcml6b250YWwocHJpb3JpdGllcykge1xyXG4gICAgICAgIG5vZGVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHByaW9yaXRpZXNbYS5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV0gLSBwcmlvcml0aWVzW2IubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgcHJpb3JpdHkgPSAwO1xyXG4gICAgICAgIHZhciB4ID0gNzAwO1xyXG4gICAgICAgIHZhciB5ID0gMjAwO1xyXG5cclxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIGlmIChwcmlvcml0aWVzW25vZGUubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldICE9PSBwcmlvcml0eSkge1xyXG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSBwcmlvcml0aWVzW25vZGUubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgICAgICAgICAgeSA9IDIwMDtcclxuICAgICAgICAgICAgICAgIHggKz0gMTUwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHkgKz0gMTUwO1xyXG4gICAgICAgICAgICBub2RlLmZ4ID0geDtcclxuICAgICAgICAgICAgbm9kZS5meSA9IHk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0R3JhcGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgJ25vZGVzJzogbm9kZXMsICdyZWxhdGlvbnNoaXBzJzogcmVsYXRpb25zaGlwcyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYXBwZW5kUmFuZG9tRGF0YVRvTm9kZTogYXBwZW5kUmFuZG9tRGF0YVRvTm9kZSxcclxuICAgICAgICBuZW80akRhdGFUb0QzRGF0YTogbmVvNGpEYXRhVG9EM0RhdGEsXHJcbiAgICAgICAgcmFuZG9tRDNEYXRhOiByYW5kb21EM0RhdGEsXHJcbiAgICAgICAgc2l6ZTogc2l6ZSxcclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhOiB1cGRhdGVXaXRoRDNEYXRhLFxyXG4gICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGE6IHVwZGF0ZVdpdGhOZW80akRhdGEsXHJcbiAgICAgICAgYXBwZW5kRGF0YVRvTm9kZU91dHdhcmQ6IGFwcGVuZERhdGFUb05vZGVPdXR3YXJkLFxyXG4gICAgICAgIGFwcGVuZERhdGFUb05vZGVJbndhcmQ6IGFwcGVuZERhdGFUb05vZGVJbndhcmQsXHJcbiAgICAgICAgcmVzZXRXaXRoTmVvNGpEYXRhOiByZXNldFdpdGhOZW80akRhdGEsXHJcbiAgICAgICAgcmVtb3ZlTm9kZTogcmVtb3ZlTm9kZSxcclxuICAgICAgICBjcmVhdGVWaWV3czogY3JlYXRlVmlld3MsXHJcbiAgICAgICAgaGlnaGxpZ2h0Tm9kZXM6IGhpZ2hsaWdodE5vZGVzLFxyXG4gICAgICAgIHVuSGlnaGxpZ2h0Tm9kZXM6IHVuSGlnaGxpZ2h0Tm9kZXMsXHJcbiAgICAgICAgb3JpZW50Rm9yY2VHcmFwaFZlcnRpY2FsOiBvcmllbnRGb3JjZUdyYXBoVmVydGljYWwsXHJcbiAgICAgICAgb3JpZW50Rm9yY2VHcmFwaEhvcml6b250YWw6IG9yaWVudEZvcmNlR3JhcGhIb3Jpem9udGFsLFxyXG4gICAgICAgIGdldEdyYXBoOiBnZXRHcmFwaCxcclxuICAgICAgICBjb2xsYXBzZU5vZGU6IGNvbGxhcHNlTm9kZSxcclxuICAgICAgICBleHBhbmROb2RlOiBleHBhbmROb2RlLFxyXG4gICAgICAgIHZlcnNpb246IHZlcnNpb25cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmVvNGpEMztcclxuIl19
