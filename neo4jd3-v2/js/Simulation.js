import * as d3 from 'd3';

let nodeRadius = 25;
let minCollision = nodeRadius * 2;
let arrowSize = 4;

export function initSimulation(svg, node, relationshipObj) {
    return d3.forceSimulation()
        .force('collide', d3.forceCollide().radius(() => {
            return minCollision;
        }))
        .force('charge', d3.forceManyBody()
            .strength(-20)
            .distanceMax(150)
            .distanceMin(50))
        .force('link', d3.forceLink()
            .id((d) => {
                return d.id;
            })
            .distance(50)
        )
        .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2,
            svg.node().parentElement.parentElement.clientHeight / 2))
        .on('tick', () => {
            tick(node, relationshipObj, );
        })
        .on('end', () => {

        });
}

function tick(node, relationship) {
    tickNodes(node);
    tickRelationships(relationship);
}

function tickNodes(node) {
    if (node) {
        node.attr('transform', (node) => {
            return 'translate(' + node.x + ', ' + node.y + ')';
        });
    }
}

function tickRelationships(relationshipObj) {
    let { relationship, relationshipOverlay, relationshipText } = relationshipObj;

    if (relationship) {
        relationship.attr('transform', (rel) => {
            let distanceBetweenNodes = Math.sqrt(Math.pow(rel.source.x - rel.target.x, 2) + Math.pow(rel.source.y - rel.target.y, 2));
            // Fix nodes if the distance is bigger than indicated length
            if (distanceBetweenNodes > 400) {
                rel.source.fx = rel.source.x;
                rel.source.fy = rel.source.y;
                rel.target.fx = rel.target.x;
                rel.target.fy = rel.target.y;
            }
            let angle = rotation(rel.source, rel.target);
            return 'translate(' + rel.source.x + ', ' + rel.source.y + ') rotate(' + angle + ')';
        });

        tickRelationshipsTexts(relationshipText);
        tickRelationshipsOutlines(relationship);
        tickRelationshipsOverlays(relationshipOverlay);
    }
}

function tickRelationshipsTexts(relationshipText) {
    relationshipText.attr('transform', (rel) => {
        let angle = (rotation(rel.source, rel.target) + 360) % 360,
            mirror = angle > 90 && angle < 270,
            center = { x: 0, y: 0 },
            n = unitaryNormalVector(rel.source, rel.target),
            nWeight = mirror ? 2 : -3,
            point = { x: (rel.target.x - rel.source.x) * 0.5 + n.x * nWeight, y: (rel.target.y - rel.source.y) * 0.5 + n.y * nWeight },
            rotatedPoint = rotatePoint(center, point, angle);

        return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
    });
}


function tickRelationshipsOutlines(relationship) {

    relationship.each(function () {
        let rel = d3.select(this),
            outline = rel.select('.outline'),
            text = rel.select('.text');

        outline.attr('d', (rel) => {
            let center = { x: 0, y: 0 },
                angle = rotation(rel.source, rel.target),
                textBoundingBox = text.node().getBBox(),
                textPadding = 5,
                u = unitaryVector(rel.source, rel.target),
                textMargin = { x: (rel.target.x - rel.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (rel.target.y - rel.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
                n = unitaryNormalVector(rel.source, rel.target),
                rotatedPointA1 = rotatePoint(center, { x: 0 + (nodeRadius + 1) * u.x - n.x, y: 0 + (nodeRadius + 1) * u.y - n.y }, angle),
                rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
                rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
                rotatedPointD1 = rotatePoint(center, { x: 0 + (nodeRadius + 1) * u.x, y: 0 + (nodeRadius + 1) * u.y }, angle),
                rotatedPointA2 = rotatePoint(center, { x: rel.target.x - rel.source.x - textMargin.x - n.x, y: rel.target.y - rel.source.y - textMargin.y - n.y }, angle),
                rotatedPointB2 = rotatePoint(center, { x: rel.target.x - rel.source.x - (nodeRadius + 1) * u.x - n.x - u.x * arrowSize, y: rel.target.y - rel.source.y - (nodeRadius + 1) * u.y - n.y - u.y * arrowSize }, angle),
                rotatedPointC2 = rotatePoint(center, { x: rel.target.x - rel.source.x - (nodeRadius + 1) * u.x - n.x + (n.x - u.x) * arrowSize, y: rel.target.y - rel.source.y - (nodeRadius + 1) * u.y - n.y + (n.y - u.y) * arrowSize }, angle),
                rotatedPointD2 = rotatePoint(center, { x: rel.target.x - rel.source.x - (nodeRadius + 1) * u.x, y: rel.target.y - rel.source.y - (nodeRadius + 1) * u.y }, angle),
                rotatedPointE2 = rotatePoint(center, { x: rel.target.x - rel.source.x - (nodeRadius + 1) * u.x + (- n.x - u.x) * arrowSize, y: rel.target.y - rel.source.y - (nodeRadius + 1) * u.y + (- n.y - u.y) * arrowSize }, angle),
                rotatedPointF2 = rotatePoint(center, { x: rel.target.x - rel.source.x - (nodeRadius + 1) * u.x - u.x * arrowSize, y: rel.target.y - rel.source.y - (nodeRadius + 1) * u.y - u.y * arrowSize }, angle),
                rotatedPointG2 = rotatePoint(center, { x: rel.target.x - rel.source.x - textMargin.x, y: rel.target.y - rel.source.y - textMargin.y }, angle);

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

function tickRelationshipsOverlays(relationshipOverlay) {
    relationshipOverlay.attr('d', (rel) => {
        let center = { x: 0, y: 0 },
            angle = rotation(rel.source, rel.target),
            n1 = unitaryNormalVector(rel.source, rel.target),
            n = unitaryNormalVector(rel.source, rel.target, 50),
            rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
            rotatedPointB = rotatePoint(center, { x: rel.target.x - rel.source.x - n.x, y: rel.target.y - rel.source.y - n.y }, angle),
            rotatedPointC = rotatePoint(center, { x: rel.target.x - rel.source.x + n.x - n1.x, y: rel.target.y - rel.source.y + n.y - n1.y }, angle),
            rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);

        return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y +
            ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y +
            ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y +
            ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y +
            ' Z';
    });
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