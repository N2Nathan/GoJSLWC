export class FloorplanPalette extends window.go.Palette {
    constructor(div, floorplan /*, nodeDataArray: Array<any>*/) {
        super(div);
        const $ = window.go.GraphObject.make;
        this.contentAlignment = window.go.Spot.Center;
        this.nodeTemplateMap = floorplan.nodeTemplateMap;
        // palette also contains "floor" nodes -- nodes of particular floor types that can be dragged and dropped into wall-enclosed areas to create Room Nodes
        this.nodeTemplateMap.add('FloorNode', $(window.go.Node, 'Auto', $(window.go.Shape, { fill: makeFloorBrush(null), desiredSize: new window.go.Size(100, 100) }, new window.go.Binding('fill', 'floorImage', function (src) {
            return makeFloorBrush(src);
        })), $(window.go.TextBlock, 'Drag me out to a wall-enclosed space to create a room', { desiredSize: new window.go.Size(90, NaN) }, new window.go.Binding('visible', '', function (node) {
            if (node.diagram instanceof window.go.Palette) {
                return true;
            }
            return false;
        }).ofObject())));
        this.toolManager.contextMenuTool.isEnabled = false;
        // add this new FloorplanPalette to the "palettes" field of its associated Floorplan
        floorplan.palettes.push(this);
    } // end FloorplanPalette constructor
}
/**
 * Make a Pattern brush for floor nodes
 * @param src The relative path of the image to use for the pattern brush. If this is not specified, a default path is tried
 */
function makeFloorBrush(src) {
    const $ = window.go.GraphObject.make;
    if (src === null || src === undefined) {
        src = 'images/textures/floor1.jpg';
    }
    const floorImage = new Image();
    floorImage.src = src;
    return $(window.go.Brush, 'Pattern', { pattern: floorImage });
}
// export = FloorplanPalette;
