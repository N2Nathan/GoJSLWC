import { tweakInspectorForFloorplanner } from './DataInspectorOverrides.js';
import { EditorHelper } from './EditorHelper.js';
import { Floorplan } from './Floorplan.js';
import { FloorplanPalette } from './FloorplanPalette.js';

/**
 * Script to set up the Floorplanner editor
 * @param {jQuery} JQUERY jQuery passed to this script in floorplannerTS/index.html via requireJS
 * @param {HTMLElement[]} diagramDivs Array of div elements for diagrams
 * @param {HTMLElement[]} paletteDivs Array of div elements for palettes
 * @param {HTMLElement[]} overviewDivs Array of div elements for overviews
 * @hidden @internal
 */
export function init(JQUERY, diagramDivs, paletteDivs, overviewDivs, inspectordiv) {
    const editorHelper = new EditorHelper(diagramDivs, paletteDivs, overviewDivs, Floorplan, inspectordiv, JQUERY);
    window.editorHelper = editorHelper;

    // replace generic palettes with FloorplanPalettes
    const myFloorplan = editorHelper.diagrams[0];
    editorHelper.palettes[0].div = null;
    editorHelper.palettes[1].div = null;

    const furniturePalette = new FloorplanPalette(paletteDivs[0], myFloorplan);
    furniturePalette.model = new window.go.GraphLinksModel(myFloorplan.makeDefaultFurniturePaletteNodeData());
    editorHelper.palettes[0] = furniturePalette;

    const wallPartsPalette = new FloorplanPalette(paletteDivs[1], myFloorplan);
    wallPartsPalette.model = new window.go.GraphLinksModel(myFloorplan.makeDefaultWallpartsPaletteNodeData());
    editorHelper.palettes[1] = wallPartsPalette;

    // listen if the model of the Floorplan changes completely -- if so, there has been a load event, and we must update walls / rooms
    myFloorplan.addDiagramListener('InitialLayoutCompleted', function (e) {
        // update units, grid size, units / px, showGrid, and preferences from the loading model's modelData
        const unitsForm = this.template.querySelector('#unitsForm');
        const gridSizeInput = this.template.querySelector('#gridSizeInput');
        const showGridCheckbox = this.template.querySelector('#showGridCheckbox');
        const gridSnapCheckbox = this.template.querySelector('#gridSnapCheckbox');
        const showWallGuidelinesCheckbox = this.template.querySelector('#wallGuidelinesCheckbox');
        const showWallLengthsCheckbox = this.template.querySelector('#showWallLengthsCheckbox');
        const showWallAnglesCheckbox = this.template.querySelector('#showWallAnglesCheckbox');
        const showOnlySmallWallAnglesCheckbox = this.template.querySelector('#onlySmallWallAnglesCheckbox');
        const unitsConversionFactorInput = this.template.querySelector('#unitsConversionFactorInput');

        const fp = e.diagram;
        const md = fp.model.modelData;
        const units = md.units;
        const unitsRadioChecked = document.getElementById(units);
        unitsRadioChecked.checked = true;

        let gridSize = md.gridSize;
        gridSize = fp.convertPixelsToUnits(gridSize);
        gridSizeInput.value = gridSize;
        fp.changeGridSize(gridSizeInput);

        const unitsConversionFactor = md.unitsConversionFactor;
        unitsConversionFactorInput.value = unitsConversionFactor;
        fp.changeUnitsConversionFactor(unitsConversionFactorInput, gridSizeInput);
        fp.changeUnits(unitsForm);

        const showGrid = md.preferences.showGrid;
        const gridSnap = md.preferences.gridSnap;
        const showWallGuidelines = md.preferences.showWallGuidelines;
        const showWallLengths = md.preferences.showWallLengths;
        const showWallAngles = md.preferences.showWallAngles;
        const showOnlySmallWallAngles = md.preferences.showOnlySmallWallAngles;

        showGridCheckbox.checked = showGrid;
        gridSnapCheckbox.checked = gridSnap;
        showWallGuidelinesCheckbox.checked = showWallGuidelines;
        showWallLengthsCheckbox.checked = showWallLengths;
        showWallAnglesCheckbox.checked = showWallAngles;
        showOnlySmallWallAnglesCheckbox.checked = showOnlySmallWallAngles;

        fp.checkboxChanged('showGridCheckbox');
        fp.checkboxChanged('gridSnapCheckbox');
        fp.checkboxChanged('wallGuidelinesCheckbox');
        fp.checkboxChanged('wallLengthsCheckbox');
        fp.checkboxChanged('wallAnglesCheckbox');
        fp.checkboxChanged('onlySmallWallAnglesCheckbox');

        // update walls and rooms geometries
        fp.nodes.iterator.each(function (n) {
            if (n.catewindow.gory === 'WallGroup') {
                fp.updateWall(n);
            }
            if (n.catewindow.gory === 'RoomNode') {
                fp.updateRoom(n);
            }
        });
    });

    /**
     * Update the tools buttons so the tool in use is highlighted
     */
    window.updateButtons = function (func, el) {
        func.call(myFloorplan);
        const toolButtons = this.template.querySelectorAll('.toolButtons');
        toolButtons.forEach(tb => {
            if (tb === el) {
                tb.style.background = '#4B545F';
                tb.style.color = 'white';
            } else {
                tb.style.background = 'rgb(221, 221, 221)';
                tb.style.color = 'black';
            }
        });
    };

    JQUERY(function () {
        JQUERY('#ge-palettes-container').accordion({
            heightStyle: 'content',
            activate: function () {
                editorHelper.palettes.forEach(palette => palette.requestUpdate());
            },
        });

        const draggables = this.template.querySelectorAll('.ge-draggable');
        console.log(draggables);
        draggables.forEach(draggable => {
            const id = '#' + draggable.id;
            const hid = id + '-handle';

            JQUERY(id).draggable({
                handle: hid,
                stack: '.ge-draggable',
                containment: 'parent',
                scroll: false,
                stop: function (event) {
                    this.style.height = 'unset';
                    const did = event.target.id;
                    // only unset width for inspector and options menu, whose widths are dependent on contents
                    if (did === 'ge-inspector-window' || did === 'optionsWindow') {
                        this.style.width = 'unset';
                    }
                },
            });
        });
    }); // end jQuery

    // add options window hotkey (other hotkeys are defined in window.goeditor-setup.js)
    document.body.addEventListener('keydown', function (e) {
        const keynum = e.which;
        if (e.ctrlKey) {
            e.preventDefault();
            if (keynum === 66) {
                editorHelper.geHideShowWindow('optionsWindow'); // ctrl + b
            }
        }
    });

    // function to tweak inspector for app-specific stuff is in floorplanner-datainspector-overrides.js
    tweakInspectorForFloorplanner(editorHelper.inspector, myFloorplan, editorHelper);

    const defaultModelTextarea = this.template.querySelector('#defaultModelTextarea');
    const defaultModelString = defaultModelTextarea.value;
    const defaultModelJson = JSON.parse(defaultModelString);
    myFloorplan.model = window.go.Model.fromJson(defaultModelJson);

    window.myFloorplan = myFloorplan;
    window.furniturePalette = furniturePalette;
    window.wallPartsPalette = wallPartsPalette;
}
