import {
	NodeLabelDraggingTool
} from "./NodeLabelDraggingTool.js";
import {
	WallBuildingTool
} from "./WallBuildingTool.js";
import {
	WallReshapingTool
} from "./WallReshapingTool.js";
export class Floorplan extends window.go.Diagram {
	constructor(t) {
		super(t);
		this._palettes = new Array;
		this._pointNodes = new window.go.Set;
		this._dimensionLinks = new window.go.Set;
		this._angleNodes = new window.go.Set;
		const e = window.go.GraphObject.make;
		this.allowLink = false;
		this.undoManager.isEnabled = true;
		this.layout.isInitial = false;
		this.layout.isOngoing = false;
		this.model = new window.go.GraphLinksModel({
			modelData: {
				units: "feet",
				unitsAbbreviation: "ft",
				unitsConversionFactor: .02,
				gridSize: 10,
				wallThickness: 1,
				preferences: {
					showWallGuidelines: true,
					showWallLengths: true,
					showWallAngles: true,
					showOnlySmallWallAngles: true,
					showGrid: true,
					gridSnap: true
				}
			}
		});
		this.grid = e(window.go.Panel, "Grid", {
			gridCellSize: new window.go.Size(this.model.modelData.gridSize, this.model.modelData.gridSize),
			visible: true
		}, e(window.go.Shape, "LineH", {
			stroke: "lightgray"
		}), e(window.go.Shape, "LineV", {
			stroke: "lightgray"
		}));
		this.contextMenu = makeContextMenu();
		this.commandHandler.canGroupSelection = function () {
			return true
		};
		this.commandHandler.canUngroupSelection = function () {
			return true
		};
		this.commandHandler.archetypeGroupData = {
			isGroup: true
		};
		this.addDiagramListener("SelectionCopied", function (t) {
			const n = t.diagram;
			n.selection.iterator.each(function (t) {
				if (t.category === "WallGroup") {
					const e = t;
					n.updateWall(e)
				}
			})
		});
		this.addDiagramListener("ExternalObjectsDropped", function (t) {
			const o = new Array;
			const i = t.diagram;
			i.selection.iterator.each(function (t) {
				if (t.category === "FloorNode") {
					const e = t;
					const n = i.lastInput.documentPoint;
					i.maybeAddRoomNode(n, e.data.floorImage);
					o.push(e)
				}
			});
			for (const e in o) {
				t.diagram.remove(o[e])
			}
		});
		this.addDiagramListener("ClipboardPasted", function (t) {
			const n = t.diagram;
			t.diagram.selection.iterator.each(function (t) {
				if (t.category === "WallGroup") {
					const e = t;
					n.updateWall(e)
				}
			})
		});
		this.addDiagramListener("ChangedSelection", function (e) {
			const t = e.diagram;
			t.skipsUndoManager = true;
			t.startTransaction("remove dimension links and angle nodes");
			t.pointNodes.iterator.each(function (t) {
				e.diagram.remove(t)
			});
			t.dimensionLinks.iterator.each(function (t) {
				e.diagram.remove(t)
			});
			const n = new Array;
			t.links.iterator.each(function (t) {
				if (t.data.category === "DimensionLink") n.push(t)
			});
			for (let t = 0; t < n.length; t++) {
				e.diagram.remove(n[t])
			}
			t.pointNodes.clear();
			t.dimensionLinks.clear();
			t.angleNodes.iterator.each(function (t) {
				e.diagram.remove(t)
			});
			t.angleNodes.clear();
			t.commitTransaction("remove dimension links and angle nodes");
			t.skipsUndoManager = false;
			t.updateWallDimensions();
			t.updateWallAngles()
		});
		this.addDiagramListener("SelectionDeleted", function (t) {
			const e = t.diagram.toolManager.mouseDownTools.elt(3);
			e.joinAllColinearWalls();
			e.splitAllWalls();
			e.performAllMitering();
			const n = t.subject;
			const o = new window.go.Set;
			n.iterator.each(function (t) {
				if (t instanceof window.go.Group && t.data.category === "WallGroup") {
					const e = t;
					o.add(e)
				}
			});
			const i = t.diagram;
			i.updateAllRoomBoundaries(o)
		});
		this.nodeTemplateMap.add("", makeDefaultNode());
		this.nodeTemplateMap.add("MultiPurposeNode", makeMultiPurposeNode());
		this.nodeTemplateMap.add("WindowNode", makeWindowNode());
		this.nodeTemplateMap.add("PaletteWallNode", makePaletteWallNode());
		this.nodeTemplateMap.add("DoorNode", makeDoorNode());
		this.nodeTemplateMap.add("RoomNode", makeRoomNode());
		this.groupTemplateMap.add("", makeDefaultGroup());
		this.groupTemplateMap.add("WallGroup", makeWallGroup());
		const n = new WallBuildingTool;
		this.toolManager.mouseDownTools.insertAt(0, n);
		const o = new WallReshapingTool;
		this.toolManager.mouseDownTools.insertAt(3, o);
		n.isEnabled = false;
		const i = new NodeLabelDraggingTool;
		this.toolManager.mouseMoveTools.insertAt(3, i);
		this.toolManager.draggingTool.doDeactivate = function () {
			const t = this.diagram;
			const e = this;
			t.updateWallAngles();
			this.isGridSnapEnabled = this.diagram.model.modelData.preferences.gridSnap;
			let n = null;
			t.selection.iterator.each(function (t) {
				if (t.category === "WallGroup" && n == null) {
					const e = t;
					n = e
				} else if (t.category === "WallGroup" && n !== null) {
					n = undefined
				}
			});
			if (n) {
				const o = new window.go.Set;
				o.add(n);
				t.updateAllRoomBoundaries(o);
				const i = t.toolManager.mouseDownTools.elt(3);
				i.performMiteringOnWall(n);
				t.updateWall(n)
			}
			window.go.DraggingTool.prototype.doDeactivate.call(this)
		};
		this.toolManager.draggingTool.doMouseMove = function () {
			if (this.diagram.lastInput.shift) {
				this.isGridSnapEnabled = false
			} else this.isGridSnapEnabled = this.diagram.model.modelData.preferences.gridSnap;
			window.go.DraggingTool.prototype.doMouseMove.call(this)
		};
		this.toolManager.resizingTool.doMouseMove = function () {
			const t = this.diagram;
			t.updateWallDimensions();
			window.go.ResizingTool.prototype.doMouseMove.call(this)
		};
		this.toolManager.resizingTool.computeMaxSize = function () {
			const o = this;
			const t = o.adornedObject;
			if (t !== null) {
				const d = t.part;
				let n = null;
				if (d !== null) {
					n = this.diagram.findPartForKey(d.data.group)
				}
				if (n !== null && d !== null && (d.category === "DoorNode" || d.category === "WindowNode")) {
					let a = null;
					let r = null;
					let t = null;
					const i = d.adornments.iterator;
					while (i.next()) {
						const c = i.value;
						if (c.name === "WallPartResizeAdornment") {
							t = c
						}
					}
					if (t !== null) {
						const u = t.elements.iterator;
						while (u.next()) {
							const g = u.value;
							const w = o.handle;
							if (w !== null) {
								if (g instanceof window.go.Shape && g.alignment === w.alignment) {
									r = g.getDocumentPoint(window.go.Spot.Center)
								}
								if (g instanceof window.go.Shape && g.alignment !== w.alignment) {
									a = g.getDocumentPoint(window.go.Spot.Center)
								}
							}
						}
					}
					let s;
					let l = Number.MAX_VALUE;
					n.memberParts.iterator.each(function (t) {
						if (t.data.key !== d.data.key) {
							const e = getWallPartEndpoints(t);
							for (let t = 0; t < e.length; t++) {
								const n = e[t];
								const o = Math.sqrt(n.distanceSquaredPoint(r));
								if (o < l) {
									const i = Math.sqrt(n.distanceSquaredPoint(a));
									if (i > o) {
										l = o;
										s = n
									}
								}
							}
						}
					});
					if (s === undefined || s === null) {
						if (n.data.startpoint.distanceSquaredPoint(r) > n.data.startpoint.distanceSquaredPoint(a)) s = n.data.endpoint;
						else s = n.data.startpoint
					}
					let e = 0;
					if (a !== null) {
						e = Math.sqrt(a.distanceSquaredPoint(s))
					}
					return new window.go.Size(e, n.data.thickness)
				}
			}
			return window.go.ResizingTool.prototype.computeMaxSize.call(o)
		};
		this.toolManager.draggingTool.isGridSnapEnabled = true
	}
	get palettes() {
		return this._palettes
	}
	set palettes(t) {
		this._palettes = t
	}
	get pointNodes() {
		return this._pointNodes
	}
	set pointNodes(t) {
		this._pointNodes = t
	}
	get dimensionLinks() {
		return this._dimensionLinks
	}
	set dimensionLinks(t) {
		this._dimensionLinks = t
	}
	get angleNodes() {
		return this._angleNodes
	}
	set angleNodes(t) {
		this._angleNodes = t
	}
	convertPixelsToUnits(t) {
		const e = this.model.modelData.units;
		const n = this.model.modelData.unitsConversionFactor;
		return t * n
	}
	convertUnitsToPixels(t) {
		const e = this.model.modelData.units;
		const n = this.model.modelData.unitsConversionFactor;
		return t / n
	}
	getUnitsAbbreviation(t) {
		switch (t) {
		case "centimeters": {
			return "cm"
		}
		case "meters": {
			return "m"
		}
		case "inches": {
			return "in"
		}
		case "feet": {
			return "ft"
		}
		}
		return t
	}
	convertUnits(t, e, n) {
		const o = this;
		let i = n;
		t = o.getUnitsAbbreviation(t);
		e = o.getUnitsAbbreviation(e);
		switch (t) {
		case "cm": {
			switch (e) {
			case "m": {
				i *= .01;
				break
			}
			case "ft": {
				i *= .0328084;
				break
			}
			case "in": {
				i *= .393701;
				break
			}
			}
			break
		}
		case "m": {
			switch (e) {
			case "cm": {
				i *= 100;
				break
			}
			case "ft": {
				i *= 3.28084;
				break
			}
			case "in": {
				i *= 39.3701;
				break
			}
			}
			break
		}
		case "ft": {
			switch (e) {
			case "cm": {
				i *= 30.48;
				break
			}
			case "m": {
				i *= .3048;
				break
			}
			case "in": {
				i *= 12;
				break
			}
			}
			break
		}
		case "in": {
			switch (e) {
			case "cm": {
				i *= 2.54;
				break
			}
			case "m": {
				i *= .0254;
				break
			}
			case "ft": {
				i *= .0833333;
				break
			}
			}
			break
		}
		}
		return i
	}
	makeDefaultFurniturePaletteNodeData() {
		return FURNITURE_NODE_DATA_ARRAY
	}
	makeDefaultWallpartsPaletteNodeData() {
		return WALLPARTS_NODE_DATA_ARRAY
	}
	enableWallBuilding() {
		const t = this;
		const e = t.toolManager.mouseDownTools.elt(0);
		e.isBuildingDivider = false;
		const n = t.toolManager.mouseDownTools.elt(3);
		e.isEnabled = true;
		n.isEnabled = false;
		t.currentCursor = "crosshair";
		t.nodes.iterator.each(function (t) {
			t.clearAdornments()
		});
		t.clearSelection()
	}
	enableDividerBuilding() {
		const t = this;
		const e = t.toolManager.mouseDownTools.elt(0);
		t.enableWallBuilding();
		e.isBuildingDivider = true;
		t.currentCursor = "crosshair"
	}
	disableWallBuilding() {
		const t = this;
		const e = t.toolManager.mouseDownTools.elt(0);
		const n = t.toolManager.mouseDownTools.elt(3);
		e.isEnabled = false;
		n.isEnabled = true;
		e.isBuildingDivider = false;
		t.currentCursor = "";
		t.nodes.iterator.each(function (t) {
			t.clearAdornments()
		});
		t.clearSelection()
	}
	checkboxChanged(t) {
		const e = this;
		e.skipsUndoManager = true;
		e.startTransaction("change preference");
		const n = document.getElementById(t);
		switch (t) {
		case "showGridCheckbox": {
			e.grid.visible = n.checked;
			e.model.modelData.preferences.showGrid = n.checked;
			break
		}
		case "gridSnapCheckbox": {
			e.toolManager.draggingTool.isGridSnapEnabled = n.checked;
			e.model.modelData.preferences.gridSnap = n.checked;
			break
		}
		case "wallGuidelinesCheckbox":
			e.model.modelData.preferences.showWallGuidelines = n.checked;
			break;
		case "wallLengthsCheckbox":
			e.model.modelData.preferences.showWallLengths = n.checked;
			e.updateWallDimensions();
			break;
		case "wallAnglesCheckbox":
			e.model.modelData.preferences.showWallAngles = n.checked;
			e.updateWallAngles();
			break;
		case "onlySmallWallAnglesCheckbox": {
			e.model.modelData.preferences.showOnlySmallWallAngles = n.checked;
			e.updateWallAngles();
			break
		}
		}
		e.commitTransaction("change preference");
		e.skipsUndoManager = false
	}
	changeUnits(t) {
		const e = this;
		const n = t.getElementsByTagName("input");
		const o = e.model.modelData.units;
		for (let t = 0; t < n.length; t++) {
			const u = n[t];
			if (u.checked) {
				const g = u.id;
				e.model.setDataProperty(e.model.modelData, "units", g);
				switch (u.id) {
				case "centimeters":
					e.model.setDataProperty(e.model.modelData, "unitsAbbreviation", "cm");
					break;
				case "meters":
					e.model.setDataProperty(e.model.modelData, "unitsAbbreviation", "m");
					break;
				case "feet":
					e.model.setDataProperty(e.model.modelData, "unitsAbbreviation", "ft");
					break;
				case "inches":
					e.model.setDataProperty(e.model.modelData, "unitsAbbreviation", "in");
					break
				}
			}
		}
		const i = e.model.modelData.unitsAbbreviation;
		const a = document.getElementsByClassName("unitsBox");
		for (let t = 0; t < a.length; t++) {
			const w = a[t];
			w.value = i
		}
		const r = document.getElementById("unitsConversionFactorInput");
		const s = parseFloat(r.value);
		const l = e.model.modelData.units;
		const d = e.convertUnits(o, l, s);
		e.model.setDataProperty(e.model.modelData, "unitsConversionFactor", d);
		r.value = d.toString();
		const c = document.getElementsByClassName("unitsInput");
		for (let t = 0; t < c.length; t++) {
			const p = c[t];
			if (p.id !== "unitsConversionFactorInput") {
				let t = parseFloat(p.value);
				t = parseFloat(e.convertUnits(o, l, t).toFixed(4));
				p.value = t.toString()
			}
		}
	}
	changeUnitsConversionFactor(t, e) {
		const n = this;
		const o = parseFloat(t.value);
		if (isNaN(o) || !o || o === undefined) return;
		n.skipsUndoManager = true;
		n.model.set(n.model.modelData, "unitsConversionFactor", o);
		if (e) {
			n.changeGridSize(e)
		}
		n.skipsUndoManager = false
	}
	changeGridSize(t) {
		const e = this;
		e.skipsUndoManager = true;
		e.startTransaction("change grid size");
		let n = 0;
		if (!isNaN(parseFloat(t.value)) && t.value != null && t.value !== "" && t.value !== undefined && parseFloat(t.value) > 0) n = parseFloat(t.value);
		else {
			t.value = e.convertPixelsToUnits(10).toString();
			n = parseFloat(t.value)
		}
		n = e.convertUnitsToPixels(n);
		e.grid.gridCellSize = new window.go.Size(n, n);
		e.model.setDataProperty(e.model.modelData, "gridSize", n);
		e.commitTransaction("change grid size");
		e.skipsUndoManager = false
	}
	getCounterClockwiseWallSide(t, e) {
		const n = this;
		const o = n.toolManager.mouseDownTools.elt(3);
		let i = null;
		let a = null;
		if (o.pointsApproximatelyEqual(t.data.endpoint, e)) {
			i = "smpt1";
			a = "smpt2"
		} else {
			i = "empt1";
			a = "empt2"
		}
		const r = e;
		const s = t.data[a];
		const l = t.data[i];

		function isClockwise(t, e, n) {
			const o = (e.x - t.x) * (n.y - t.y) - (e.y - t.y) * (n.x - t.x) > 0;
			return o
		}
		if (!isClockwise(r, s, l)) {
			return 1
		} else return 2
	}
	getLinesIntersection(t, e, n, o) {
		const i = (t.y - e.y) / (t.x - e.x);
		const a = (n.y - o.y) / (n.x - o.x);
		if (i === Infinity || i === -Infinity) {
			const r = t.x;
			const s = -1 * (a * n.x - n.y);
			const l = a * r + s;
			return new window.go.Point(r, l)
		}
		if (a === Infinity || a === -Infinity) {
			const r = n.x;
			const d = -1 * (i * t.x - t.y);
			const l = i * r + d;
			return new window.go.Point(r, l)
		}
		if (Math.abs(i - a) < Math.pow(2, -52)) {
			return null
		} else {
			const r = (i * t.x - a * n.x + n.y - t.y) / (i - a);
			const l = (i * a * (n.x - t.x) + a * t.y - i * n.y) / (a - i);
			const c = new window.go.Point(r, l);
			return c
		}
	}
	updateAllRoomBoundaries(T) {
		const M = this;
		const N = M.toolManager.mouseDownTools.elt(3);
		const t = M.findNodesByExample({
			category: "RoomNode"
		});
		const e = new Array;
		t.iterator.each(function (r) {
			let s = false;
			let l = false;
			const d = new window.go.Set;
			while (!s && !l) {
				const c = r.data.boundaryWalls;
				let e = null;
				let n = null;
				for (let t = 0; t < c.length + 1; t++) {
					const S = c[t % c.length];
					const A = S[0];
					const b = M.findNodeForKey(A);
					if (b === null) continue;
					if (!T.contains(b) && !d.contains(b)) {
						if (e === null) {
							e = S
						} else if (e !== null && n === null) {
							n = S
						}
					} else if (e !== null && n === null) {
						n = S
					} else if (e === null) {
						e = null;
						n = null
					}
				}
				let t = null;
				let o = null;
				let i = null;
				let a = null;
				if (e !== null && n !== null) {
					t = M.findNodeForKey(e[0]);
					i = e[1];
					o = M.findNodeForKey(n[0]);
					a = n[1]
				} else {
					l = true;
					continue
				}
				if (e !== null && t !== null) {
					d.add(t)
				}
				const u = t.data["smpt" + i];
				const g = t.data["empt" + i];
				const w = o.data["smpt" + a];
				const p = o.data["empt" + a];
				const f = M.getSegmentsIntersection(u, g, w, p);
				if (f === null) {
					continue
				}
				const m = i === 1 ? 2 : 1;
				const h = f.distanceSquaredPoint(t.data["smpt" + m]);
				const y = f.distanceSquaredPoint(t.data["empt" + m]);
				const k = h <= y ? t.data.startpoint : t.data.endpoint;
				const x = k.directionPoint(f);
				const P = N.translateAndRotatePoint(f, x - 90, .5);
				s = M.maybeAddRoomNode(P, r.data.floorImage, r)
			}
			if (!s) {
				e.push(r)
			}
		});
		for (let t = 0; t < e.length; t++) {
			M.remove(e[t])
		}
		M.updateAllTargetBindings()
	}
	maybeAddRoomNode(a, t, e) {
		if (e === undefined || e === null) {
			e = null
		}
		const r = this;
		const n = r.findNodesByExample({
			category: "WallGroup"
		});
		let s = false;
		n.iterator.each(function (t) {
			if (r.isPointInWall(t, a)) {
				s = true
			}
		});
		const o = r.findNodesByExample({
			category: "RoomNode"
		});
		o.iterator.each(function (n) {
			if (e === null || e !== null && e !== undefined && e.data.key !== n.data.key) {
				const t = r.isPointInRoom(n, a);
				if (t) {
					let e = false;
					for (let t = 0; t < n.data.holes.length; t++) {
						const o = n.data.holes[t];
						const i = r.makePolygonFromRoomBoundaries(o);
						if (i !== null) {
							if (r.isPointInPolygon(i.toArray(), a)) {
								e = true
							}
						}
					}
					if (!e) {
						s = true
					}
				}
			}
		});
		if (s) {
			return false
		}
		const i = r.getRoomWalls(a);
		if (i === null) {
			return false
		}
		const l = r.findRoomHoles(i, a);
		if (e !== null) {
			r.startTransaction("update room boundaryWalls and holes");
			r.model.setDataProperty(e.data, "boundaryWalls", i);
			r.model.setDataProperty(e.data, "holes", l);
			r.commitTransaction("update room boundaryWalls and holes")
		} else {
			if (t === null || t === undefined) {
				t = "images/textures/floor1.jpg"
			}
			const d = {
				key: "Room",
				category: "RoomNode",
				name: "Room Name",
				boundaryWalls: i,
				holes: l,
				floorImage: t,
				showLabel: true,
				showFlooringOptions: true
			};
			r.model.addNodeData(d);
			e = r.findPartForData(d)
		}
		r.updateRoom(e);
		return true
	}
	getRoomWalls(y) {
		const k = this;
		const t = k.findNodesByExample({
			category: "WallGroup"
		});
		const x = new window.go.Point(y.x, y.y - 1e4);
		const o = new Array;
		t.iterator.each(function (t) {
			const e = k.getSegmentsIntersection(y, x, t.data.startpoint, t.data.endpoint);
			if (e !== null) {
				const n = Math.sqrt(e.distanceSquaredPoint(y));
				o.push([t, n])
			}
		});
		o.sort(function (t, e) {
			const n = t[1];
			const o = e[1];
			if (n === o) return 0;
			else if (n < o) return -1;
			else return 1
		});

		function selectivelyCopyPath(e, n) {
			const o = new Array;
			let i = false;
			for (let t = 0; t < e.length; t++) {
				const a = e[t];
				const r = a[0];
				const s = k.findNodeForKey(r);
				const l = a[1];
				if (!i) {
					o.push([s.data.key, l]);
					if (s.data.key === n.data.key) {
						i = true
					}
				}
			}
			return o
		}

		function recursivelyFindPaths(s, l, d, c, u, t) {
			if (s === null) {
				return null
			}
			if (c === undefined || c === null) {
				c = new window.go.Set
			}
			c.add(s);
			const g = k.toolManager.mouseDownTools.elt(3);
			const e = s.data.startpoint;
			const n = s.data.endpoint;
			const o = new window.go.Point((e.x + n.x) / 2, (e.y + n.y) / 2);
			const i = o.directionPoint(e);
			let w;
			let a;
			if (t === undefined || t === null) {
				w = i >= 90 && i <= 270 ? e : n;
				a = i >= 90 && i <= 270 ? n : e
			} else {
				w = g.pointsApproximatelyEqual(e, t) ? n : e;
				a = g.pointsApproximatelyEqual(e, t) ? e : n
			}
			const p = g.getAllWallsAtIntersection(w, true);
			p.sort(function (t, e) {
				const n = k.getWallsIntersection(t, e);
				if (n === null) return 0;
				const o = t.data.startpoint;
				const i = t.data.endpoint;
				const a = e.data.startpoint;
				const r = e.data.endpoint;
				const s = g.pointsApproximatelyEqual(w, o) ? i : o;
				const l = g.pointsApproximatelyEqual(w, a) ? r : a;
				const d = n.directionPoint(s);
				const c = n.directionPoint(l);
				if (d > c) return 1;
				else if (d < c) return -1;
				else return 0
			});
			const r = p.toArray();
			const f = new Array;
			let m = r.indexOf(s);
			for (let t = 0; t < r.length; t++) {
				const h = r[m];
				f.push(h);
				m = (m + 1) % r.length
			}
			p.clear();
			for (let t = 0; t < f.length; t++) {
				const h = f[t];
				p.add(h)
			}
			p.iterator.each(function (t) {
				if (t === undefined || t === null) {
					d = new window.go.Set;
					return d
				}
				if ((t.data.key === u.data.key || p.contains(u)) && s.data.key !== u.data.key) {
					if (l !== null) {
						d.add(l)
					}
				} else if (c !== null && !c.contains(t)) {
					if (l === undefined || l === null) {
						l = new Array;
						const n = k.getLinesIntersection(y, x, s.data.smpt1, s.data.empt1);
						const o = k.getLinesIntersection(y, x, s.data.smpt2, s.data.empt2);
						if (n !== null && o !== null) {
							const i = Math.sqrt(n.distanceSquaredPoint(y));
							const a = Math.sqrt(o.distanceSquaredPoint(y));
							const r = i < a ? 1 : 2;
							l.push([s.data.key, r])
						}
					} else {
						l = selectivelyCopyPath(l, s)
					}
					const e = k.getCounterClockwiseWallSide(t, w);
					l.push([t.data.key, e]);
					recursivelyFindPaths(t, l, d, c, u, w)
				}
			});
			return d
		}
		let i = null;
		let a = null;
		for (let e = 0; e < o.length; e++) {
			const r = o[e];
			const s = r[0];
			let n = new Array;
			let t = new window.go.Set;
			t = recursivelyFindPaths(s, null, t, null, s, null);
			if (t === null || t.count === 0) continue;
			n = t.first();
			const l = k.makePolygonFromRoomBoundaries(n);
			if (l !== null) {
				let e = false;
				for (let t = 0; t < n.length; t++) {
					const d = n[t];
					const c = d[0];
					const u = k.findNodeForKey(c);
					const g = u.data.endpoint;
					const w = u.data.startpoint;
					if (k.isPointInPolygon(l.toArray(), g) || k.isPointInPolygon(l.toArray(), w)) {
						e = true
					}
				}
				if (k.isPointInPolygon(l.toArray(), y)) {
					i = l;
					a = n;
					break
				}
			}
		}
		if (i !== null) {
			const e = k.addInternalWallsToRoom(i, a);
			return e
		} else {
			return null
		}
	}
	makePolygonFromRoomBoundaries(t) {
		const e = this;
		const n = new window.go.List;
		const o = t;
		if (o === null || o.length < 2) {
			return null
		}
		const i = o[0][0];
		const a = e.findNodeForKey(i);
		const r = o[0][1];
		const s = o[1][0];
		const l = e.findNodeForKey(s);
		if (a === null || l === null) {
			return null
		}
		const d = e.getWallsIntersection(a, l);
		if (d === null) return null;
		const c = "smpt" + r;
		const u = "empt" + r;
		const g = a.data[c];
		const w = a.data[u];
		const p = Math.sqrt(d.distanceSquaredPoint(g));
		const f = Math.sqrt(d.distanceSquaredPoint(w));
		const m = p < f ? g : w;
		const h = m.equals(g) ? w : g;
		n.add(h);
		n.add(m);
		let y = m;
		let k = a;
		for (let t = 0; t < o.length; t++) {
			const x = o[t];
			if (typeof x === "string") continue;
			const P = x[0];
			const S = e.findNodeForKey(P);
			if (S === null) {
				return null
			}
			const A = x[1];
			if (S.data.key !== a.data.key) {
				const b = "smpt" + A;
				const T = "empt" + A;
				const M = S.data[b];
				const N = S.data[T];
				const W = Math.sqrt(y.distanceSquaredPoint(M));
				const D = Math.sqrt(y.distanceSquaredPoint(N));
				const B = W < D ? M : N;
				const j = B.equals(M) ? N : M;
				n.add(B);
				n.add(j);
				y = j;
				k = S
			}
		}
		return n
	}
	sortWallsClockwise(t, e) {
		const n = this;
		const o = n.toolManager.mouseDownTools.elt(3);
		const i = n.getWallsIntersection(t, e);
		if (i === null) {
			return 0
		}
		const a = t.data.startpoint;
		const r = t.data.endpoint;
		const s = e.data.startpoint;
		const l = e.data.endpoint;
		const d = n.getSegmentsIntersection(a, r, s, l);
		if (d === null) {
			return 0
		}
		const c = o.pointsApproximatelyEqual(d, a) ? r : a;
		const u = o.pointsApproximatelyEqual(d, s) ? l : s;
		const g = i.directionPoint(c);
		const w = i.directionPoint(u);
		if (g > w) return 1;
		else if (g < w) return -1;
		else return 0
	}
	sortWallsClockwiseWithSetStartWall(e, t) {
		const n = this;
		e.sort(function (t, e) {
			return n.sortWallsClockwise(t, e)
		});
		const o = e.toArray();
		const i = new Array;
		let a = o.indexOf(t);
		for (let t = 0; t < o.length; t++) {
			const r = o[a];
			i.push(r);
			a = (a + 1) % o.length
		}
		e.clear();
		for (let t = 0; t < i.length; t++) {
			const r = i[t];
			e.add(r)
		}
		return e
	}
	addInternalWallsToRoom(o, w) {
		const A = this;
		const t = A.findNodesByExample({
			category: "WallGroup"
		});
		const p = new window.go.Set;
		t.iterator.each(function (t) {
			const e = t.data.startpoint;
			const n = t.data.endpoint;
			if (A.isPointInPolygon(o.toArray(), e) || A.isPointInPolygon(o.toArray(), n)) {
				p.add(t)
			}
		});

		function recursivelyFindInteralClusterPath(t, e, y, k, x, P, S) {
			k.add(window.go.Point.stringify(y));
			e.iterator.each(function (i) {
				if (i.data.key !== t.data.key) {
					if (i.data.key === S.data.key) {
						if (x.indexOf("isDone") === -1) {
							x.push("isDone")
						}
						return x
					}
					if (x.indexOf("isDone") !== -1) {
						return x
					}
					let e = null;
					e = A.getCounterClockwiseWallSide(i, y);
					const a = [i.data.key, e];
					for (let t = 0; t < x.length; t++) {
						const d = x[t];
						const c = d[0];
						const u = A.findNodeForKey(c);
						const g = d[1];
						if (i.data.key === u.data.key && g === e) {
							return
						}
					}
					x.push(a);
					const r = b.pointsApproximatelyEqual(y, i.data.startpoint) ? i.data.endpoint : i.data.startpoint;
					let t = b.getAllWallsAtIntersection(r, true);
					if (t !== null && t.count > 1) {
						t = A.sortWallsClockwiseWithSetStartWall(t, i)
					}
					let n = false;
					if (!k.contains(window.go.Point.stringify(r))) {
						n = true
					}
					let o = false;
					if (!n) {
						const w = t.toArray()[1];
						const p = A.getCounterClockwiseWallSide(w, r);
						for (let t = 0; t < x.length; t++) {
							const f = x[t];
							const c = f[0];
							const u = A.findNodeForKey(c);
							const g = f[1];
							if (u.data.key === w.data.key && g === p) {
								o = true
							}
						}
					}
					const s = t.contains(P);
					const l = n ? true : !o && !s;
					if (t.count > 1 && l) {
						return recursivelyFindInteralClusterPath(i, t, r, k, x, P, S)
					} else if (!s) {
						const m = e === 1 ? 2 : 1;
						const h = [i.data.key, m];
						x.push(h);
						let t = b.getAllWallsAtIntersection(y, true);
						if (t !== null && t.count > 1) {
							t = A.sortWallsClockwiseWithSetStartWall(t, i)
						}
						return recursivelyFindInteralClusterPath(i, t, y, k, x, P, S)
					} else if (x.indexOf("isDone") === -1) {
						x.push("isDone");
						return
					}
				}
			});
			return x
		}
		const b = A.toolManager.mouseDownTools.elt(3);
		const f = new window.go.Set;
		const m = new window.go.Map;
		p.iterator.each(function (t) {
			if (!f.contains(t)) {
				const o = t.data.startpoint;
				const a = t.data.endpoint;
				let e = null;
				let n = null;
				let i = null;
				for (let t = 0; t < w.length; t++) {
					const r = w[t];
					if (typeof r === "string") continue;
					const s = r[0];
					const l = A.findNodeForKey(s);
					const d = l.data.startpoint;
					const c = l.data.endpoint;
					if (b.pointsApproximatelyEqual(d, o) || b.pointsApproximatelyEqual(d, a) || b.pointsApproximatelyEqual(c, o) || b.pointsApproximatelyEqual(c, a)) {
						if (e === null) {
							e = l;
							i = A.getSegmentsIntersection(e.data.startpoint, e.data.endpoint, o, a)
						} else {
							n = l
						}
					}
				}
				if (i !== null && e !== null && n !== null && w[0][0] === e.data.key && w[w.length - 1][0] === n.data.key) {
					let t = null;
					t = e;
					e = n;
					n = t
				}
				if (i !== null) {
					let o = new window.go.List;
					if (e !== null) {
						o.add(e)
					}
					p.iterator.each(function (t) {
						const e = t.data.startpoint;
						const n = t.data.endpoint;
						if (i !== null) {
							if (b.pointsApproximatelyEqual(e, i) || b.pointsApproximatelyEqual(n, i)) {
								o.add(t);
								f.add(t)
							}
						}
					});
					if (n !== null) {
						o.add(n)
					}
					if (e !== null) {
						o = A.sortWallsClockwiseWithSetStartWall(o, e)
					}
					const u = new Array;
					const g = new window.go.Set;
					if (e !== null && n !== null) {
						let t = recursivelyFindInteralClusterPath(e, o, i, g, u, e, n);
						t = t.slice(0, t.length - 1);
						m.add(e, t)
					}
				}
			}
		});
		m.iterator.each(function (t) {
			const e = t.key;
			const n = t.value;
			let o;
			for (let t = 0; t < w.length; t++) {
				const r = w[t];
				if (typeof r === "string") continue;
				const s = r[0];
				const l = A.findNodeForKey(s);
				if (l.data.key === e.data.key) {
					o = t + 1
				}
			}
			const i = w.slice(0, o);
			const a = w.slice(o, w.length);
			w = i.concat(n).concat(a)
		});
		return w
	}
	getClockwiseWallEndpoint(t, e) {
		const n = this;
		const o = n.toolManager.mouseDownTools.elt(3);
		let i = null;
		let a = null;
		const r = t.data["smpt" + e];
		const s = t.data["empt" + e];
		const l = new window.go.Point((r.x + s.x) / 2, (r.y + s.y) / 2);
		const d = r.directionPoint(s) + 180;
		const c = t.data.thickness / 2;
		const u = o.translateAndRotatePoint(l, d, c);
		const g = o.translateAndRotatePoint(l, d + 180, c);
		let w = null;
		let p = null;

		function isPointLeftOfRay(t, e, n) {
			return (t.y - e.y) * (n.x - e.x) > (t.x - e.x) * (n.y - e.y)
		}
		if (n.isPointInWall(t, u)) {
			w = u;
			p = g
		} else {
			w = g;
			p = u
		}
		if (isPointLeftOfRay(w, r, s)) {
			i = t.data.endpoint;
			a = t.data.startpoint
		} else {
			i = t.data.startpoint;
			a = t.data.endpoint
		}
		return i
	}
	findRoomHoles(r, z) {
		const I = this;
		const H = I.toolManager.mouseDownTools.elt(3);
		const t = I.findNodesByExample({
			category: "WallGroup"
		});
		const d = new window.go.Set;
		const s = I.makePolygonFromRoomBoundaries(r);
		t.iterator.each(function (n) {
			const t = n.data.startpoint;
			const e = n.data.endpoint;
			if (s !== null && (I.isPointInPolygon(s.toArray(), t) || I.isPointInPolygon(s.toArray(), e))) {
				let e = false;
				for (let t = 0; t < r.length; t++) {
					const o = r[t];
					const i = o[0];
					const a = I.findNodeForKey(i);
					if (a.data.key === n.data.key) {
						e = true
					}
				}
				if (!e) {
					d.add(n)
				}
			}
		});
		const U = new window.go.Set;

		function recursivelyFindHolePath(n, r, s, t, l) {
			let e = null;
			if (s === null || s === undefined) {
				s = new Array;
				const y = n.data.startpoint;
				const k = n.data.endpoint;
				const x = new window.go.Point((y.x + k.x) / 2, (y.y + k.y) / 2);
				const P = I.getLinesIntersection(z, x, n.data.smpt1, n.data.empt1);
				const S = I.getLinesIntersection(z, x, n.data.smpt2, n.data.empt2);
				if (P !== null && S !== null) {
					const A = Math.sqrt(P.distanceSquaredPoint(z));
					const b = Math.sqrt(S.distanceSquaredPoint(z));
					e = A < b ? 1 : 2;
					U.add(n);
					s.push([n.data.key, e])
				}
			}
			if (s.indexOf("isDone") !== -1) {
				return s
			}
			let d = null;
			let o = null;
			const i = n.data.startpoint;
			const a = n.data.endpoint;
			if (t !== null && t !== undefined) {
				d = H.pointsApproximatelyEqual(i, t) ? a : i;
				o = H.pointsApproximatelyEqual(i, t) ? i : a
			} else {
				if (e !== null) {
					d = I.getClockwiseWallEndpoint(n, e);
					if (d !== null) {
						o = H.pointsApproximatelyEqual(d, i) ? a : i
					}
				}
			}
			if (r === null || r === undefined) {
				r = new window.go.Set
			}
			if (d !== null) {
				r.add(window.go.Point.stringify(d))
			}
			let c = H.getAllWallsAtIntersection(d, true);
			let u = H.getAllWallsAtIntersection(o, true);
			if (c !== null && c.count > 1) {
				c = I.sortWallsClockwiseWithSetStartWall(c, n)
			}
			let g = false;
			if (d !== null && !r.contains(window.go.Point.stringify(d))) {
				g = true
			}
			let w = false;
			if (!g && c.toArray().length > 0) {
				let e = null;
				if (c.toArray().length > 1) {
					e = c.toArray()[1]
				} else {
					e = c.toArray()[0]
				}
				if (d !== null) {
					const T = I.getCounterClockwiseWallSide(e, d);
					for (let t = 0; t < s.length; t++) {
						const M = s[t];
						const N = M[0];
						const W = I.findNodeForKey(N);
						const D = M[1];
						if (W.data.key === e.data.key && D === T) {
							w = true
						}
					}
				}
			}
			let p = false;
			let f = false;
			for (let t = 0; t < s.length; t++) {
				const M = s[t];
				const B = M[0];
				const W = I.findNodeForKey(B);
				if (W.data.key === n.data.key && !p) {
					p = true
				} else if (W.data.key === n.data.key && p && !f) {
					f = true
				}
			}
			const m = p && f && w && s.length < 3;
			const v = c.count > 1 && c.toArray()[1].data.key === l.data.key;
			const G = v && (n.data.key !== l.data.key || m) || m && n.data.key === l.data.key;
			const h = g ? true : !w;
			if (!h && s.indexOf("isDone") === -1) {
				s.push("isDone")
			}
			if (h) {
				c.iterator.each(function (o) {
					if (s !== null && o.data.key !== n.data.key && s.indexOf("isDone") === -1) {
						if (d !== null) {
							const e = I.getCounterClockwiseWallSide(o, d);
							const t = [o.data.key, e];
							s.push(t);
							U.add(o);
							recursivelyFindHolePath(o, r, s, d, l)
						}
					} else if (c.count === 1 && s !== null && s.indexOf("isDone") === -1) {
						let n = null;
						for (let e = 0; e < s.length; e++) {
							const t = s[e][0];
							const i = I.findNodeForKey(t);
							if (i.data.key === o.data.key) {
								const t = s[e][1];
								const a = t === 1 ? 2 : 1;
								n = [i.data.key, a]
							}
						}
						s.push(n);
						if (u.count === 1) {
							s.push("isDone")
						}
					}
				})
			}
			if (s.indexOf("isDone") !== -1) {
				return s.slice(0, s.length - 1)
			} else if (u.count > 1) {
				const j = c.last();
				if (u !== null && j !== null) {
					u = I.sortWallsClockwiseWithSetStartWall(u, j)
				}
				const O = u.toArray()[1];
				if (o !== null) {
					const L = I.getCounterClockwiseWallSide(O, o);
					const M = [O.data.key, L];
					let e = false;
					for (let t = 0; t < s.length; t++) {
						const F = s[t];
						const E = M[0];
						const q = I.findNodeForKey(E);
						const C = F[0];
						const R = I.findNodeForKey(C);
						if (q.data.key === R.data.key && M[1] === F[1]) {
							e = true
						}
					}
					if (M !== null && !e) {
						s.push(M);
						U.add(O);
						recursivelyFindHolePath(O, r, s, o, l)
					} else if (e) {
						return s
					}
				}
			}
			if (s.indexOf("isDone") !== -1) {
				s = s.slice(0, s.length - 1)
			}
			return s
		}
		const c = new Array;
		d.iterator.each(function (t) {
			if (!U.contains(t)) {
				const n = t.data.startpoint;
				const o = t.data.endpoint;
				const i = new window.go.Point((n.x + o.x) / 2, (n.y + o.y) / 2);
				const a = new Array;
				d.iterator.each(function (t) {
					const e = I.getSegmentsIntersection(z, i, t.data.startpoint, t.data.endpoint);
					if (e !== null) {
						const n = Math.sqrt(e.distanceSquaredPoint(z));
						a.push([t, n])
					}
				});
				a.sort(function (t, e) {
					const n = t[1];
					const o = e[1];
					if (n === o) return 0;
					else if (n < o) return -1;
					else return 1
				});
				let e = null;
				for (let t = 0; t < a.length; t++) {
					const r = a[t][0];
					if (!U.contains(r) && e === null) {
						e = r
					}
				}
				if (e !== null) {
					const s = recursivelyFindHolePath(e, null, null, null, e);
					const l = I.makePolygonFromRoomBoundaries(s);
					if (l !== null) {
						d.iterator.each(function (t) {
							const e = t.data.smpt1;
							if (I.isPointInPolygon(l.toArray(), e) || I.isPointInPolygon(l.toArray(), e)) {
								U.add(t)
							}
						});
						c.push(s)
					}
				}
			}
		});
		return c
	}
	getPathPts(o) {
		const i = this;
		const a = new window.go.List;
		const t = o[0][0];
		const r = i.findNodeForKey(t);
		const s = o[0][1];
		const e = o[1][0];
		const n = i.findNodeForKey(e);
		let l = i.getWallsIntersection(r, n);
		if (r.data.key === n.data.key) {
			l = i.getClockwiseWallEndpoint(r, s)
		}
		if (l !== null) {
			const d = "smpt" + s;
			const c = "empt" + s;
			const u = r.data[d];
			const g = r.data[c];
			const w = Math.sqrt(l.distanceSquaredPoint(u));
			const p = Math.sqrt(l.distanceSquaredPoint(g));
			const f = w < p ? u : g;
			const m = f.equals(u) ? g : u;
			a.add(m);
			a.add(f);
			let e = f;
			let n = r;
			for (let t = 0; t < o.length; t++) {
				const h = o[t];
				if (typeof h === "string") continue;
				const y = h[0];
				const k = i.findNodeForKey(y);
				const x = h[1];
				if (t !== 0) {
					const P = "smpt" + x;
					const S = "empt" + x;
					const A = k.data[P];
					const b = k.data[S];
					const T = Math.sqrt(e.distanceSquaredPoint(A));
					const M = Math.sqrt(e.distanceSquaredPoint(b));
					const N = T < M ? A : b;
					const W = f.equals(A) ? b : A;
					if (n.data.key === k.data.key) {
						a.add(e);
						a.add(N)
					}
					a.add(N);
					a.add(W);
					e = W;
					n = k
				}
			}
		}
		return a
	}
	getPolygonArea(e) {
		let n = 0;
		let o = 0;
		for (let t = 0; t < e.length; t++) {
			n = (t + 1) % e.length;
			o += e[t].x * e[n].y;
			o -= e[t].y * e[n].x
		}
		o /= 2;
		return o < 0 ? -o : o
	}
	getRoomArea(t) {
		const e = this;
		const n = e.getPathPts(t.data.boundaryWalls);
		const o = e.getPolygonArea(n.toArray());
		let i = 0;
		const a = t.data.holes;
		for (let t = 0; t < a.length; t++) {
			const r = a[t];
			const s = e.getPathPts(r);
			const l = e.getPolygonArea(s.toArray());
			i += l
		}
		return o - i
	}
	isPointInWall(t, e) {
		const n = this;
		const o = [t.data.startpoint, t.data.smpt1, t.data.empt1, t.data.endpoint, t.data.empt2, t.data.smpt2, t.data.startpoint];
		return n.isPointInPolygon(o, e)
	}
	isPointInRoom(t, e) {
		const n = this;
		if (t === null || t === undefined || !(t instanceof window.go.Node) || t.data.category !== "RoomNode") return false;
		const o = n.makePolygonFromRoomBoundaries(t.data.boundaryWalls);
		if (o !== null) {
			const i = o.toArray();
			const a = n.isPointInPolygon(i, e);
			return a
		}
		return false
	}
	isPointInPolygon(n, t) {
		const o = t.x;
		const i = t.y;
		let a = false;
		for (let t = 0, e = n.length - 1; t < n.length; e = t++) {
			const r = n[t].x;
			const s = n[t].y;
			const l = n[e].x;
			const d = n[e].y;
			const c = s > i !== d > i && o < (l - r) * (i - s) / (d - s) + r;
			if (c) a = !a
		}
		return a
	}
	updateWall(i) {
		if (i.data.startpoint && i.data.endpoint) {
			const a = i.findObject("SHAPE");
			const r = i.data;
			let t = null;
			let e = [r.startpoint, r.endpoint, r.smpt1, r.smpt2, r.empt1, r.empt2];
			if (i.data.isDivider) {
				a.strokeWidth = 2;
				a.opacity = .5
			}
			e = [r.startpoint, r.endpoint, r.smpt1, r.smpt2, r.empt1, r.empt2];
			t = (new window.go.Geometry).add(new window.go.PathFigure(r.startpoint.x, r.startpoint.y).add(new window.go.PathSegment(window.go.SegmentType.Line, r.smpt1.x, r.smpt1.y)).add(new window.go.PathSegment(window.go.SegmentType.Line, r.empt1.x, r.empt1.y)).add(new window.go.PathSegment(window.go.SegmentType.Line, r.endpoint.x, r.endpoint.y)).add(new window.go.PathSegment(window.go.SegmentType.Line, r.empt2.x, r.empt2.y)).add(new window.go.PathSegment(window.go.SegmentType.Line, r.smpt2.x, r.smpt2.y)).add(new window.go.PathSegment(window.go.SegmentType.Line, r.startpoint.x, r.startpoint.y)));
			t.normalize();
			a.geometry = t;
			let n = Number.MAX_VALUE;
			let o = Number.MAX_VALUE;
			for (let t = 0; t < e.length; t++) {
				const s = e[t];
				if (s.x < n) {
					n = s.x
				}
				if (s.y < o) {
					o = s.y
				}
			}
			i.position = new window.go.Point(n, o);
			i.location = new window.go.Point(n, o)
		}
	}
	updateRoom(t) {
		const B = this;
		const e = t.findObject("SHAPE");
		const n = new window.go.Geometry;
		const j = new Array;
		const o = t.data.boundaryWalls;
		if (o === null) return;
		let O = null;
		addPathToGeo(o);

		function addPathToGeo(e) {
			const t = e[0][0];
			const n = B.findNodeForKey(t);
			const o = e[0][1];
			const i = e[1][0];
			const a = B.findNodeForKey(i);
			let r = B.getWallsIntersection(n, a);
			if (n.data.key === a.data.key) {
				r = B.getClockwiseWallEndpoint(n, o)
			}
			if (r === null) return;
			const s = "smpt" + o;
			const l = "empt" + o;
			const d = n.data[s];
			const c = n.data[l];
			const u = Math.sqrt(r.distanceSquaredPoint(d));
			const g = Math.sqrt(r.distanceSquaredPoint(c));
			const w = u < g ? d : c;
			const p = w.equals(d) ? c : d;
			const f = p.copy();
			j.push(p);
			j.push(w);
			if (O === null) {
				O = new window.go.PathFigure(p.x, p.y)
			} else {
				O.add(new window.go.PathSegment(window.go.SegmentType.Move, p.x, p.y))
			}
			O.add(new window.go.PathSegment(window.go.SegmentType.Line, w.x, w.y));
			let m = w;
			let h = n;
			for (let t = 0; t < e.length; t++) {
				const y = e[t];
				if (typeof y === "string") continue;
				const k = y[0];
				const x = B.findNodeForKey(k);
				const P = y[1];
				if (t !== 0) {
					const S = "smpt" + P;
					const A = "empt" + P;
					const b = x.data[S];
					const T = x.data[A];
					const M = Math.sqrt(m.distanceSquaredPoint(b));
					const N = Math.sqrt(m.distanceSquaredPoint(T));
					const W = M < N ? b : T;
					const D = W.equals(b) ? T : b;
					if (h.data.key === x.data.key) {
						O.add(new window.go.PathSegment(window.go.SegmentType.Line, m.x, m.y));
						O.add(new window.go.PathSegment(window.go.SegmentType.Line, W.x, W.y))
					}
					O.add(new window.go.PathSegment(window.go.SegmentType.Line, W.x, W.y));
					O.add(new window.go.PathSegment(window.go.SegmentType.Line, D.x, D.y));
					j.push(W);
					j.push(D);
					m = D;
					h = x
				}
			}
			O.add(new window.go.PathSegment(window.go.SegmentType.Line, f.x, f.y))
		}
		const i = t.data.holes;
		if (i !== null && i.length !== 0) {
			for (let t = 0; t < i.length; t++) {
				const l = i[t];
				addPathToGeo(l)
			}
		}
		if (O !== null) {
			n.add(O)
		}
		n.normalize();
		e.geometry = n;
		let a = Number.MAX_VALUE;
		let r = Number.MAX_VALUE;
		for (let t = 0; t < j.length; t++) {
			const d = j[t];
			if (d.x < a) {
				a = d.x
			}
			if (d.y < r) {
				r = d.y
			}
		}
		t.position = new window.go.Point(a, r);
		t.location = new window.go.Point(a, r);
		B.model.setDataProperty(t.data, "loc", new window.go.Point(a, r));
		const s = B.getRoomArea(t);
		B.model.setDataProperty(t.data, "area", s)
	}
	getAdjustedPoint(t, e, n, o) {
		const i = t.copy();
		t.offset(0, -(e.data.thickness * .5) - o);
		t.offset(-i.x, -i.y).rotate(n).offset(i.x, i.y);
		return t
	}
	buildDimensionLink(t, e, n, o, i, a, r, s, l, d, c, u) {
		n = s.getAdjustedPoint(n, t, i, a);
		o = s.getAdjustedPoint(o, t, i, a);
		if (d === undefined || d === null || isNaN(d)) {
			d = 1
		}
		if (u === undefined || u === null || isNaN(u)) {
			u = 2
		}
		if (c === undefined || c === null) {
			c = "gray"
		}
		const g = {
			key: t.data.key + "PointNode" + l + e,
			category: "PointNode",
			loc: window.go.Point.stringify(n)
		};
		const w = {
			key: t.data.key + "PointNode" + l + (e + 1),
			category: "PointNode",
			loc: window.go.Point.stringify(o)
		};
		const p = {
			key: t.data.key + "DimensionLink",
			category: "DimensionLink",
			from: g.key,
			to: w.key,
			angle: i,
			wall: t.data.key,
			soloWallFlag: r
		};
		const f = makePointNode();
		const m = makePointNode();
		const h = makeDimensionLink(d, c, u);
		s.pointNodes.add(f);
		s.pointNodes.add(m);
		s.dimensionLinks.add(h);
		s.add(f);
		s.add(m);
		s.add(h);
		f.data = g;
		m.data = w;
		h.data = p;
		h.fromNode = f;
		h.toNode = m;
		h.data.length = Math.sqrt(f.location.distanceSquaredPoint(m.location))
	}
	updateWallDimensions(t) {
		const p = this;
		p.skipsUndoManager = true;
		p.startTransaction("update wall dimensions");
		if (!p.model.modelData.preferences.showWallLengths) {
			p.pointNodes.iterator.each(function (t) {
				p.remove(t)
			});
			p.dimensionLinks.iterator.each(function (t) {
				p.remove(t)
			});
			p.pointNodes.clear();
			p.dimensionLinks.clear();
			p.commitTransaction("update wall dimensions");
			p.skipsUndoManager = false;
			return
		}
		p.pointNodes.iterator.each(function (t) {
			p.remove(t)
		});
		p.dimensionLinks.iterator.each(function (t) {
			p.remove(t)
		});
		p.pointNodes.clear();
		p.dimensionLinks.clear();
		const e = t !== null && t !== undefined ? t : p.selection;
		const l = new window.go.Set;
		e.iterator.each(function (t) {
			if ((t.category === "WindowNode" || t.category === "DoorNode") && t.containingGroup !== null) {
				l.add(t.containingGroup)
			}
			if (t.category === "WallGroup" && t.data && t.data.startpoint && t.data.endpoint) {
				const n = t;
				let e = false;
				n.memberParts.each(function (t) {
					if (t.isSelected) {
						e = true
					}
				});
				if (!e) {
					const o = n.data.startpoint.directionPoint(n.data.endpoint);
					const i = n.data.smpt1;
					const a = n.data.empt1;
					let t = i.x + i.y <= a.x + a.y ? i : a;
					let e = i.x + i.y > a.x + a.y ? i : a;
					p.buildDimensionLink(n, 1, t.copy(), e.copy(), (o + 180) % 360, 10, true, p, 1);
					const r = n.data.smpt2;
					const s = n.data.empt2;
					t = r.x + r.y <= s.x + s.y ? r : s;
					e = r.x + r.y > s.x + s.y ? r : s;
					p.buildDimensionLink(n, 2, t.copy(), e.copy(), o, 10, true, p, 1)
				}
			}
		});
		l.iterator.each(function (s) {
			for (let i = 1; i < 3; i++) {
				const t = s.data["smpt" + i];
				const n = s.data["empt" + i];
				const a = t.x + t.y <= n.x + n.y ? t : n;
				const l = t.x + t.y > n.x + n.y ? t : n;
				let r = s.data.startpoint.directionPoint(s.data.endpoint);
				if (i === 1) {
					r = (r + 180) % 360
				}
				const d = new Array;
				s.memberParts.iterator.each(function (t) {
					if (t.isSelected) {
						const e = getWallPartEndpoints(t);
						const n = e[0];
						const o = e[1];
						const i = p.rotateAndTranslatePoint(n, r + 0, s.data.thickness / 2);
						const a = p.rotateAndTranslatePoint(o, r + 0, s.data.thickness / 2);
						d.push(n);
						d.push(o)
					}
				});
				d.sort(function (t, e) {
					if (t.x + t.y > e.x + e.y) return 1;
					if (t.x + t.y < e.x + e.y) return -1;
					else return 0
				});
				d.unshift(a);
				d.push(l);
				let o = 1;
				for (let n = 0; n < d.length - 1; n++) {
					let t = null;
					let e = null;
					const c = p.pointNodes.iterator;
					while (c.next()) {
						const u = c.value;
						if (u.data.key === s.data.key + "PointNode" + o) {
							t = u
						}
						if (u.data.key === s.data.key + "PointNode" + (o + 1)) {
							e = u
						}
					}
					if (t !== null && e !== null) {
						const g = p.getAdjustedPoint(d[n].copy(), s, r, 15);
						const w = p.getAdjustedPoint(d[n + 1].copy(), s, r, 15);
						t.data.loc = window.go.Point.stringify(g);
						e.data.loc = window.go.Point.stringify(w);
						t.updateTargetBindings();
						e.updateTargetBindings()
					} else {
						p.buildDimensionLink(s, o, d[n].copy(), d[n + 1].copy(), r, 15, false, p, i, .5, "gray", 1)
					}
					o += 2
				}
				let e = null;
				p.dimensionLinks.iterator.each(function (t) {
					if (t.fromNode !== null && t.toNode !== null && t.fromNode.data.key === s.data.key + "PointNode" + i + o && t.toNode.data.key === s.data.key + "PointNode" + i + (o + 1)) {
						e = t
					}
				});
				if (e !== null) {
					let t = null;
					let e = null;
					const c = p.pointNodes.iterator;
					while (c.next()) {
						const u = c.value;
						if (u.data.key === s.data.key + "PointNode" + o) {
							t = u
						}
						if (u.data.key === s.data.key + "PointNode" + (o + 1)) {
							e = u
						}
					}
					if (t !== null && e !== null) {
						const g = p.getAdjustedPoint(d[0].copy(), s, r, 25);
						const w = p.getAdjustedPoint(d[d.length - 1].copy(), s, r, 25);
						t.data.loc = window.go.Point.stringify(g);
						e.data.loc = window.go.Point.stringify(w);
						t.updateTargetBindings();
						e.updateTargetBindings()
					}
				} else {
					p.buildDimensionLink(s, o, d[0].copy(), d[d.length - 1].copy(), r, 25, false, p, i)
				}
			}
		});
		p.dimensionLinks.iterator.each(function (e) {
			let n = false;
			p.pointNodes.iterator.each(function (t) {
				if (t.data.key === e.data.to) n = true
			});
			if (!n) p.remove(e);
			else {
				if (e !== null && e.toNode !== null && e.fromNode !== null) {
					const t = Math.sqrt(e.toNode.location.distanceSquaredPoint(e.fromNode.location));
					if (t < 1 && !e.data.soloWallFlag) e.visible = false
				}
			}
		});
		p.commitTransaction("update wall dimensions");
		p.skipsUndoManager = false
	}
	rotateAndTranslatePoint(t, e, n) {
		const o = t.x;
		const i = t.y;
		const a = Math.cos(o * Math.PI / 180) * n + o;
		const r = Math.sin(o * Math.PI / 180) * n + i;
		const s = new window.go.Point(a, r);
		return s
	}
	getWallsIntersection(t, e) {
		if (t === null || e === null) {
			return null
		}
		const n = t.data.startpoint.x;
		const o = t.data.startpoint.y;
		const i = t.data.endpoint.x;
		const a = t.data.endpoint.y;
		const r = e.data.startpoint.x;
		const s = e.data.startpoint.y;
		const l = e.data.endpoint.x;
		const d = e.data.endpoint.y;
		if (n === i && o === a || r === l && s === d) {
			return null
		}
		const c = (d - s) * (i - n) - (l - r) * (a - o);

		function pointsApproximatelyEqual(t, e) {
			const n = t.x;
			const o = e.x;
			const i = t.y;
			const a = e.y;
			const r = Math.abs(o - n);
			const s = Math.abs(a - i);
			if (s < .05 && r < .05) {
				return true
			}
			return false
		}
		if (c === 0) {
			if (pointsApproximatelyEqual(t.data.startpoint, e.data.startpoint) || pointsApproximatelyEqual(t.data.startpoint, e.data.endpoint)) return t.data.startpoint;
			if (pointsApproximatelyEqual(t.data.endpoint, e.data.startpoint) || pointsApproximatelyEqual(t.data.endpoint, e.data.endpoint)) return t.data.endpoint;
			return null
		}
		const u = ((l - r) * (o - s) - (d - s) * (n - r)) / c;
		const g = ((i - n) * (o - s) - (a - o) * (n - r)) / c;
		const w = +u.toFixed(2);
		const p = +g.toFixed(2);
		if (w < 0 || w > 1 || p < 0 || p > 1) {
			return null
		}
		const f = n + u * (i - n);
		const m = o + u * (a - o);
		return new window.go.Point(f, m)
	}
	getSegmentsIntersection(t, e, n, o) {
		const i = t.x;
		const a = t.y;
		const r = e.x;
		const s = e.y;
		const l = n.x;
		const d = n.y;
		const c = o.x;
		const u = o.y;
		if (i === r && a === s || l === c && d === u) {
			return null
		}
		const g = (u - d) * (r - i) - (c - l) * (s - a);

		function pointsApproximatelyEqual(t, e) {
			const n = t.x;
			const o = e.x;
			const i = t.y;
			const a = e.y;
			const r = Math.abs(o - n);
			const s = Math.abs(a - i);
			if (s < .05 && r < .05) {
				return true
			}
			return false
		}
		if (g === 0) {
			if (pointsApproximatelyEqual(t, n) || pointsApproximatelyEqual(t, o)) return t;
			if (pointsApproximatelyEqual(e, n) || pointsApproximatelyEqual(e, o)) return e;
			return null
		}
		const w = ((c - l) * (a - d) - (u - d) * (i - l)) / g;
		const p = ((r - i) * (a - d) - (s - a) * (i - l)) / g;
		const f = +w.toFixed(4);
		const m = +p.toFixed(4);
		if (f < 0 || f > 1 || m < 0 || m > 1) {
			return null
		}
		const h = i + w * (r - i);
		const y = a + w * (s - a);
		return new window.go.Point(h, y)
	}
	updateWallAngles() {
		const y = this;
		y.skipsUndoManager = true;
		y.startTransaction("display angles");
		if (y.model.modelData.preferences.showWallAngles) {
			y.angleNodes.iterator.each(function (t) {
				t.visible = true
			});
			const n = new Array;
			y.selection.iterator.each(function (t) {
				if (t.category === "WallGroup") {
					const e = t;
					n.push(e)
				}
			});
			for (let t = 0; t < n.length; t++) {
				const o = new window.go.Set;
				const i = n[t];
				const e = y.findNodesByExample({
					category: "WallGroup"
				});
				e.iterator.each(function (t) {
					if (t.data === null || i.data === null || o.contains(t.data.key)) return;
					if (t.data.key !== i.data.key && y.getWallsIntersection(i, t) !== null && !o.contains(t.data.key)) {
						o.add(t.data.key);
						const a = y.getWallsIntersection(i, t);
						if (a !== null) {
							const e = y.toolManager.mouseDownTools.elt(3);
							const r = e.getAllWallsAtIntersection(a);
							const s = new Array;
							r.iterator.each(function (t) {
								const e = y.model.modelData.gridSize >= 10 ? y.model.modelData.gridSize : 10;
								if (Math.sqrt(t.data.startpoint.distanceSquaredPoint(a)) > e) s.push({
									point: t.data.startpoint,
									wall: t.data.key
								});
								if (Math.sqrt(t.data.endpoint.distanceSquaredPoint(a)) > e) s.push({
									point: t.data.endpoint,
									wall: t.data.key
								})
							});
							let i = 30;
							for (let t = 0; t < s.length; t++) {
								const n = Math.sqrt(s[t].point.distanceSquaredPoint(a));
								if (n < i) i = n
							}
							s.sort(function (t, e) {
								t = t.point;
								e = e.point;
								if (t.x - a.x >= 0 && e.x - a.x < 0) return 1;
								if (t.x - a.x < 0 && e.x - a.x >= 0) return -1;
								if (t.x - a.x === 0 && e.x - a.x === 0) {
									if (t.y - a.y >= 0 || e.y - a.y >= 0) return t.y > e.y ? 1 : -1;
									return e.y > t.y ? 1 : -1
								}
								const n = (t.x - a.x) * (e.y - a.y) - (e.x - a.x) * (t.y - a.y);
								if (n < 0) return 1;
								if (n > 0) return -1;
								const o = (t.x - a.x) * (t.x - a.x) + (t.y - a.y) * (t.y - a.y);
								const i = (e.x - a.x) * (e.x - a.x) + (e.y - a.y) * (e.y - a.y);
								return o > i ? 1 : -1
							});
							for (let o = 0; o < s.length; o++) {
								const l = s[o];
								let t;
								if (s[o + 1] != null) {
									t = s[o + 1]
								} else {
									t = s[0]
								}
								const d = a.directionPoint(l.point);
								const c = a.directionPoint(t.point);
								const u = Math.abs(c - d + 360) % 360;
								const g = d;
								const w = new Array;
								r.iterator.each(function (t) {
									w.push(t)
								});
								w.sort(function (t, e) {
									const n = t.data.key.match(/\d+/g);
									const o = e.data.key.match(/\d+/g);
									if (isNaN(n)) return 1;
									if (isNaN(o)) return -1;
									else return n > o ? 1 : -1
								});
								let e = "";
								for (let t = 0; t < w.length; t++) e += w[t].data.key;
								e += "angle" + o;
								let n = null;
								const p = y.angleNodes.iterator;
								while (p.next()) {
									const f = p.value;
									if (f.data.key === e) {
										n = f
									}
								}
								if (n !== null) {
									n.data.angle = g;
									n.data.sweep = u;
									n.data.loc = window.go.Point.stringify(a);
									n.data.maxRadius = i;
									n.updateTargetBindings()
								} else {
									const m = {
										key: e,
										category: "AngleNode",
										loc: window.go.Point.stringify(a),
										stroke: "dodgerblue",
										angle: g,
										sweep: u,
										maxRadius: i
									};
									const h = makeAngleNode();
									h.data = m;
									y.add(h);
									h.updateTargetBindings();
									y.angleNodes.add(h)
								}
							}
						}
					}
				})
			}
			const d = new Array;
			y.angleNodes.iterator.each(function (e) {
				const n = e.data.key.match(/\d+/g);
				const t = (e.data.key.match(/wall/g) || new Array).length;
				const o = new Array;
				for (let t = 0; t < n.length - 1; t++) {
					o.push("wall" + n[t])
				}
				if (t !== n.length - 1) {
					o.push("wall")
				}
				for (let t = 0; t < o.length - 1; t++) {
					const r = y.findPartForKey(o[t]);
					const s = y.findPartForKey(o[t + 1]);
					const l = y.getWallsIntersection(r, s);
					if (l === null) d.push(e)
				}
				const i = new window.go.Set;
				const a = e.data.key.slice(0, e.data.key.indexOf("angle"));
				y.angleNodes.iterator.each(function (t) {
					if (t.data.key.indexOf(a) !== -1) i.add(t)
				});
				i.iterator.each(function (t) {
					if (t.data.loc !== e.data.loc) {
						d.push(t)
					}
				});
				if (e.data.sweep === 0) d.push(e)
			});
			for (let t = 0; t < d.length; t++) {
				y.remove(d[t]);
				y.angleNodes.remove(d[t])
			}
		}
		if (y.model.modelData.preferences.showOnlySmallWallAngles) {
			y.angleNodes.iterator.each(function (t) {
				if (t.data.sweep >= 180) t.visible = false
			})
		}
		if (!y.model.modelData.preferences.showWallAngles) {
			y.angleNodes.iterator.each(function (t) {
				t.visible = false
			})
		}
		y.commitTransaction("display angles");
		y.skipsUndoManager = false
	}
	findClosestLocOnWall(t, e) {
		let n = new Array;
		const o = t.data.startpoint.copy();
		const i = t.data.endpoint.copy();
		const a = o.x + o.y <= i.x + i.y ? o : i;
		const r = o.x + o.y > i.x + i.y ? o : i;
		const s = new Array;
		t.memberParts.iterator.each(function (t) {
			const e = getWallPartEndpoints(t);
			s.push(e[0]);
			s.push(e[1])
		});
		s.sort(function (t, e) {
			if (t.x + t.y > e.x + e.y) {
				return 1
			}
			if (t.x + t.y < e.x + e.y) {
				return -1
			} else {
				return 0
			}
		});
		n.push(a);
		n = n.concat(s);
		n.push(r);
		const l = new Array;
		for (let t = 0; t < n.length; t += 2) {
			const m = n[t];
			const h = n[t + 1];
			const y = Math.sqrt(m.distanceSquaredPoint(h));
			if (y >= e.data.length) {
				l.push({
					pt1: m,
					pt2: h
				})
			}
		}
		let d = Number.MAX_VALUE;
		let c = null;
		for (let t = 0; t < l.length; t++) {
			const k = l[t];
			const x = k.pt1;
			const P = k.pt2;
			const S = Math.sqrt(x.distanceSquaredPoint(e.location));
			const A = Math.sqrt(P.distanceSquaredPoint(e.location));
			if (S < d) {
				d = S;
				c = k
			}
			if (A < d) {
				d = A;
				c = k
			}
		}
		if (c === null) {
			return null
		}
		const u = Math.sqrt(c.pt1.distanceSquaredPoint(c.pt2));
		const g = e.data.length / 2;
		const w = new window.go.Point(c.pt1.x + g / u * (c.pt2.x - c.pt1.x), c.pt1.y + g / u * (c.pt2.y - c.pt1.y));
		const p = new window.go.Point(c.pt2.x + g / u * (c.pt1.x - c.pt2.x), c.pt2.y + g / u * (c.pt1.y - c.pt2.y));
		const f = e.location.copy().projectOntoLineSegmentPoint(w, p);
		return f
	}
}

function makeSelectionGroup(t) {
	t.startTransaction("group selection");
	const e = t.selection;
	const n = new Array;
	e.iterator.each(function (t) {
		if (t instanceof window.go.Group) {
			t.memberParts.iterator.each(function (t) {
				n.push(t)
			})
		} else {
			n.push(t)
		}
	});
	for (let t = 0; t < n.length; t++) {
		n[t].isSelected = true
	}
	ungroupSelection(t);
	t.commandHandler.groupSelection();
	const o = t.selection.first();
	if (o !== null) {
		t.model.setDataProperty(o.data, "caption", "Group");
		t.model.setDataProperty(o.data, "notes", "")
	}
	clearEmptyGroups(t);
	t.clearSelection();
	t.select(o);
	t.commitTransaction("group selection")
}

function ungroupSelection(o) {
	o.startTransaction("ungroup selection");

	function ungroupNode(t) {
		const e = t.containingGroup;
		t.containingGroup = null;
		if (e !== null) {
			if (e.memberParts.count === 0) {
				o.remove(e)
			} else if (e.memberParts.count === 1) {
				const n = e.memberParts.first();
				if (n !== null) {
					n.containingGroup = null
				}
			}
		}
	}
	const t = o.selection;
	const e = new Array;
	t.iterator.each(function (t) {
		if (!(t instanceof window.go.Group)) {
			ungroupNode(t)
		} else {
			e.push(t)
		}
	});
	const n = new Array;
	for (let t = 0; t < e.length; t++) {
		e[t].memberParts.iterator.each(function (t) {
			n.push(t)
		})
	}
	for (let t = 0; t < n.length; t++) {
		ungroupNode(n[t])
	}
	clearEmptyGroups(o);
	o.commitTransaction("ungroup selection")
}

function clearEmptyGroups(e) {
	const t = e.nodes;
	const n = new Array;
	t.iterator.each(function (t) {
		if (t instanceof window.go.Group && t.memberParts.count === 0 && t.category !== "WallGroup") {
			n.push(t)
		}
	});
	for (let t = 0; t < n.length; t++) {
		e.remove(n[t])
	}
}

function makeGroupToolTip() {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, "Auto", t(window.go.Shape, {
		fill: "#FFFFCC"
	}), t(window.go.TextBlock, {
		margin: 4
	}, new window.go.Binding("text", "", function (t, e) {
		const n = e.part.adornedObject.data;
		const o = e.part.adornedObject.category === "MultiPurposeNode" ? n.text : n.caption;
		return "Name: " + o + "\nNotes: " + n.notes + "\nMembers: " + e.part.adornedObject.memberParts.count
	}).ofObject()))
}

function makeContextMenu() {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, "Vertical", t("ContextMenuButton", t(window.go.TextBlock, "Make Room"), {
		click(t, e) {
			const n = t.diagram;
			const o = t.diagram.lastInput.documentPoint;
			n.maybeAddRoomNode(o, "images/textures/floor1.jpg")
		}
	}), t("ContextMenuButton", t(window.go.TextBlock, "Make Group"), {
		click(t, e) {
			const n = e.part;
			if (n !== null) {
				const o = n.diagram;
				makeSelectionGroup(o)
			}
		}
	}, new window.go.Binding("visible", "visible", function (t, e) {
		const n = e.part.diagram;
		if (n.selection.count <= 1) {
			return false
		}
		let o = true;
		n.selection.iterator.each(function (t) {
			if (t.category === "WallGroup" || t.category === "WindowNode" || t.category === "DoorNode" || t.category === "RoomNode") {
				o = false
			}
		});
		return o
	}).ofObject()), t("ContextMenuButton", t(window.go.TextBlock, "Ungroup"), {
		click(t, e) {
			const n = e.part;
			if (n !== null) {
				const o = n.diagram;
				ungroupSelection(o)
			}
		}
	}, new window.go.Binding("visible", "", function (t, e) {
		const n = e.part.diagram;
		if (n !== null) {
			const o = n.selection.first();
			return o instanceof window.go.Node && o.containingGroup != null && o.containingGroup.category !== "WallGroup" || o instanceof window.go.Group && o.category === ""
		}
		return false
	}).ofObject()), t("ContextMenuButton", t(window.go.TextBlock, "Copy"), {
		click: function (t, e) {
			const n = e.part;
			if (n !== null && n.diagram !== null) {
				n.diagram.commandHandler.copySelection()
			}
		}
	}, new window.go.Binding("visible", "", function (t, n) {
		if (n.part.diagram !== null) {
			const o = n.part.diagram.selection;
			let e = o.count > 0;
			o.iterator.each(function (t) {
				if (t.category === "WallGroup" || t.category === "WindowNode" || t.category === "DoorNode" || t.category === "RoomNode") {
					e = false
				}
			});
			return e
		}
		return false
	}).ofObject()), t("ContextMenuButton", t(window.go.TextBlock, "Cut"), {
		click(t, e) {
			const n = e.part;
			if (n !== null && n.diagram !== null) {
				n.diagram.commandHandler.cutSelection()
			}
		}
	}, new window.go.Binding("visible", "", function (t, n) {
		if (n.part.diagram !== null) {
			const o = n.part.diagram.selection;
			let e = o.count > 0;
			o.iterator.each(function (t) {
				if (t.category === "WallGroup" || t.category === "WindowNode" || t.category === "DoorNode" || t.category === "RoomNode") {
					e = false
				}
			});
			return e
		}
		return false
	}).ofObject()), t("ContextMenuButton", t(window.go.TextBlock, "Delete"), {
		click(t, e) {
			const n = e.part;
			if (n !== null && n.diagram !== null) {
				n.diagram.commandHandler.deleteSelection()
			}
		}
	}, new window.go.Binding("visible", "", function (t, e) {
		if (e.part.diagram !== null) {
			return e.part.diagram.selection.count > 0
		}
		return false
	}).ofObject()), t("ContextMenuButton", t(window.go.TextBlock, "Paste"), {
		click(t, e) {
			const n = e.part;
			if (n !== null && n.diagram !== null) {
				n.diagram.commandHandler.pasteSelection(n.diagram.toolManager.contextMenuTool.mouseDownPoint)
			}
		}
	}))
}

function makeDefaultGroup() {
	const t = window.go.GraphObject.make;
	return t(window.go.Group, "Vertical", {
		contextMenu: makeContextMenu(),
		toolTip: makeGroupToolTip()
	}, new window.go.Binding("location", "loc"), t(window.go.Panel, "Auto", t(window.go.Shape, "RoundedRectangle", {
		fill: "rgba(128,128,128,0.15)",
		stroke: "rgba(128, 128, 128, .05)",
		name: "SHAPE",
		strokeCap: "square"
	}, new window.go.Binding("fill", "isSelected", function (t, e) {
		return t ? "rgba(128, 128, 128, .15)" : "rgba(128, 128, 128, 0.10)"
	}).ofObject()), t(window.go.Placeholder, {
		padding: 5
	})))
}

function makeArc(t) {
	const e = t.data.angle;
	const n = t.data.sweep;
	const o = Math.min(30, t.data.maxRadius);
	if (typeof n === "number" && n > 0) {
		const i = new window.go.Point(o, 0).rotate(e);
		return (new window.go.Geometry).add(new window.go.PathFigure(i.x + o, i.y + o).add(new window.go.PathSegment(window.go.SegmentType.Arc, e, n, o, o, o, o))).add(new window.go.PathFigure(0, 0)).add(new window.go.PathFigure(2 * o, 2 * o))
	} else {
		return (new window.go.Geometry).add(new window.go.PathFigure(0, 0)).add(new window.go.PathFigure(2 * o, 2 * o))
	}
}

function makePointNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Position", new window.go.Binding("location", "loc", window.go.Point.parse).makeTwoWay(window.go.Point.stringify))
}

function makeAngleNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		locationSpot: window.go.Spot.Center,
		locationObjectName: "SHAPE",
		selectionAdorned: false
	}, new window.go.Binding("location", "loc", window.go.Point.parse).makeTwoWay(window.go.Point.stringify), t(window.go.Shape, "Circle", {
		name: "SHAPE",
		height: 0,
		width: 0
	}), t(window.go.Shape, {
		strokeWidth: 1.5,
		fill: null
	}, new window.go.Binding("geometry", "", makeArc).ofObject(), new window.go.Binding("stroke", "sweep", function (t) {
		return t % 45 < 1 || t % 45 > 44 ? "dodgerblue" : "lightblue"
	})), t(window.go.Panel, "Auto", {
		name: "ARCLABEL"
	}, new window.go.Binding("alignment", "sweep", function (t, e) {
		const n = Math.min(30, e.part.data.maxRadius);
		const o = e.part.data.angle;
		const i = new window.go.Point(n, 0).rotate(o + t / 2);
		return new window.go.Spot(.5, .5, i.x, i.y)
	}), t(window.go.Shape, {
		fill: "white"
	}, new window.go.Binding("stroke", "sweep", function (t) {
		return t % 45 < 1 || t % 45 > 44 ? "dodgerblue" : "lightblue"
	})), t(window.go.TextBlock, {
		font: "7pt sans-serif",
		margin: 2
	}, new window.go.Binding("text", "sweep", function (t) {
		return t.toFixed(2) + String.fromCharCode(176)
	}))))
}

function makeDimensionLink(t, e, n) {
	if (t === null || t === undefined || isNaN(t)) {
		t = 1
	}
	if (n === null || n === undefined || isNaN(n)) {
		n = 2
	}
	if (e === null || e === undefined) {
		e = "gray"
	}
	const o = window.go.GraphObject.make;
	return o(window.go.Link, o(window.go.Shape, {
		stroke: e,
		strokeWidth: n,
		name: "SHAPE",
		opacity: t
	}), o(window.go.Shape, {
		toArrow: "OpenTriangle",
		stroke: e,
		strokeWidth: n,
		opacity: t
	}), o(window.go.Shape, {
		fromArrow: "BackwardOpenTriangle",
		stroke: e,
		strokeWidth: n,
		opacity: t
	}), o(window.go.Panel, "Auto", new window.go.Binding("angle", "angle", function (t, e) {
		if (t > 90 && t < 270) {
			return (t + 180) % 360
		}
		return t
	}), o(window.go.Shape, "RoundedRectangle", {
		fill: "beige",
		opacity: .8,
		stroke: null
	}), o(window.go.TextBlock, {
		text: "sometext",
		segmentOffset: new window.go.Point(0, -10),
		font: "13px sans-serif"
	}, new window.go.Binding("text", "", function (t) {
		const e = t.diagram;
		const n = t.data.length;
		const o = e.convertPixelsToUnits(n).toFixed(2);
		const i = e.model.modelData.unitsAbbreviation;
		return o.toString() + i
	}).ofObject(), new window.go.Binding("segmentOffset", "angle", function (t, e) {
		return new window.go.Point(0, 10)
	}).ofObject(), new window.go.Binding("font", "", function (t) {
		const e = t.data.length;
		if (e > 40) {
			return "13px sans-serif"
		}
		if (e <= 40 && e >= 20) {
			return "11px sans-serif"
		} else {
			return "9px sans-serif"
		}
	}).ofObject())))
}

function makeNodeToolTip() {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, "Auto", t(window.go.Shape, {
		fill: "#FFFFCC"
	}), t(window.go.TextBlock, {
		margin: 4
	}, new window.go.Binding("text", "", function (t, e) {
		const n = e.part.adornedObject.data;
		const o = e.part.adornedObject.category === "MultiPurposeNode" ? n.text : n.caption;
		return "Name: " + o + "\nNotes: " + n.notes
	}).ofObject()))
}

function makeFurnitureResizeAdornmentTemplate() {
	const n = window.go.GraphObject.make;

	function makeHandle(t, e) {
		return n(window.go.Shape, {
			alignment: t,
			cursor: e,
			figure: "Rectangle",
			desiredSize: new window.go.Size(7, 7),
			fill: "lightblue",
			stroke: "dodgerblue"
		})
	}
	return n(window.go.Adornment, "Spot", n(window.go.Placeholder), makeHandle(window.go.Spot.Top, "n-resize"), makeHandle(window.go.Spot.TopRight, "n-resize"), makeHandle(window.go.Spot.BottomRight, "se-resize"), makeHandle(window.go.Spot.Right, "e-resize"), makeHandle(window.go.Spot.Bottom, "s-resize"), makeHandle(window.go.Spot.BottomLeft, "sw-resize"), makeHandle(window.go.Spot.Left, "w-resize"), makeHandle(window.go.Spot.TopLeft, "nw-resize"))
}

function makeFurnitureRotateAdornmentTemplate() {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, t(window.go.Shape, "Circle", {
		cursor: "pointer",
		desiredSize: new window.go.Size(7, 7),
		fill: "lightblue",
		stroke: "dodgerblue"
	}))
}

function invertColor(t) {
	if (t.indexOf("#") === 0) {
		t = t.slice(1)
	}
	if (t.length === 3) {
		t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2]
	}
	if (t.length !== 6) {
		throw new Error("Invalid HEX color.")
	}
	const e = (255 - parseInt(t.slice(0, 2), 16)).toString(16);
	const n = (255 - parseInt(t.slice(2, 4), 16)).toString(16);
	const o = (255 - parseInt(t.slice(4, 6), 16)).toString(16);
	return "#" + padZero(e) + padZero(n) + padZero(o)
}

function padZero(t) {
	const e = 2;
	const n = new Array(e).join("0");
	return (n + t).slice(-e)
}

function makeDefaultNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		resizable: true,
		rotatable: true,
		toolTip: makeNodeToolTip(),
		resizeAdornmentTemplate: makeFurnitureResizeAdornmentTemplate(),
		rotateAdornmentTemplate: makeFurnitureRotateAdornmentTemplate(),
		contextMenu: makeContextMenu(),
		locationObjectName: "SHAPE",
		resizeObjectName: "SHAPE",
		rotateObjectName: "SHAPE",
		minSize: new window.go.Size(5, 5),
		locationSpot: window.go.Spot.Center,
		selectionAdornmentTemplate: makeTextureSelectionAdornment(null)
	}, new window.go.Binding("location", "loc", window.go.Point.parse).makeTwoWay(window.go.Point.stringify), new window.go.Binding("layerName", "isSelected", function (t) {
		return t ? "Foreground" : ""
	}).ofObject(), t(window.go.Shape, "Ellipse", {
		name: "SHAPE",
		stroke: "#000000",
		fill: "white"
	}, new window.go.Binding("geometryString", "geo"), new window.go.Binding("figure", "shape").makeTwoWay(), new window.go.Binding("width").makeTwoWay(), new window.go.Binding("height").makeTwoWay(), new window.go.Binding("angle").makeTwoWay(), new window.go.Binding("fill", "texture", function (t, e) {
		return updateNodeTexture(e, t)
	}), new window.go.Binding("fill", "usesTexture", function (t, e) {
		const n = e.part;
		if (n === null) return null;
		const o = n.data.texture;
		return updateNodeTexture(e, o)
	})))
}

function makeMultiPurposeNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		contextMenu: makeContextMenu(),
		toolTip: makeNodeToolTip(),
		locationSpot: window.go.Spot.Center,
		resizeAdornmentTemplate: makeFurnitureResizeAdornmentTemplate(),
		rotateAdornmentTemplate: makeFurnitureRotateAdornmentTemplate(),
		selectionAdornmentTemplate: makeTextureSelectionAdornment(null),
		locationObjectName: "SHAPE",
		resizable: true,
		rotatable: true,
		resizeObjectName: "SHAPE",
		rotateObjectName: "SHAPE",
		minSize: new window.go.Size(5, 5)
	}, new window.go.Binding("location", "loc", window.go.Point.parse).makeTwoWay(window.go.Point.stringify), new window.go.Binding("layerName", "isSelected", function (t) {
		return t ? "Foreground" : ""
	}).ofObject(), t(window.go.Shape, {
		strokeWidth: 1,
		name: "SHAPE",
		fill: "rgba(128, 128, 128, 0.5)"
	}, new window.go.Binding("angle").makeTwoWay(), new window.go.Binding("width").makeTwoWay(), new window.go.Binding("height").makeTwoWay(), new window.go.Binding("fill", "texture", function (t, e) {
		return updateNodeTexture(e, t)
	}), new window.go.Binding("fill", "usesTexture", function (t, e) {
		const n = e.part;
		if (n === null) return null;
		const o = n.data.texture;
		return updateNodeTexture(e, o)
	}), new window.go.Binding("stroke", "isSelected", function (t, e) {
		return t ? window.go.Brush.lightenBy(e.stroke, .5) : invertColor(e.part.data.color)
	}).ofObject()), t(window.go.Panel, "Auto", new window.go.Binding("visible", "showLabel"), t(window.go.Shape, "RoundedRectangle", {
		fill: "beige",
		opacity: .5,
		stroke: null
	}), t(window.go.TextBlock, {
		margin: 5,
		wrap: window.go.Wrap.Fit,
		textAlign: "center",
		editable: true,
		isMultiline: false,
		stroke: "black",
		font: "10pt sans-serif"
	}, new window.go.Binding("text").makeTwoWay(), new window.go.Binding("angle", "angle").makeTwoWay(), new window.go.Binding("font", "height", function (t) {
		if (t > 25) {
			return "10pt sans-serif"
		}
		if (t < 25 && t > 15) {
			return "8pt sans-serif"
		} else {
			return "6pt sans-serif"
		}
	}))))
}

function updateNodeTexture(t, e) {
	const n = t.part;
	if (n === null) return "";
	if (n.data.usesTexture !== undefined && n.data.usesTexture) {
		if (e === "") {
			return makeTextureBrush(null)
		} else {
			const o = e.indexOf("images/textures") === -1 ? "images/textures/" + e : e;
			return makeTextureBrush(o)
		}
	} else {
		if (n.data.color !== undefined) {
			return n.data.color
		} else {
			return "white"
		}
	}
}
const addWallPart = function (t, e) {
	if (!(e instanceof window.go.Group)) return;
	if (e.data.isDivider) return;
	const n = t.diagram;
	const o = n.selection.first();
	if (o && (o.category === "WindowNode" || o.category === "DoorNode") && o.containingGroup === null) {
		const i = n.findClosestLocOnWall(e, o);
		if (i !== null) {
			const a = e.findObject("SHAPE");
			a.stroke = "black";
			n.model.setDataProperty(o.data, "group", e.data.key);
			o.location = i.projectOntoLineSegmentPoint(e.data.startpoint, e.data.endpoint);
			o.angle = e.data.startpoint.directionPoint(e.data.endpoint);
			if (o.category === "WindowNode") {
				n.model.setDataProperty(o.data, "height", e.data.thickness)
			}
			if (o.category === "DoorNode") {
				n.model.setDataProperty(o.data, "doorOpeningHeight", e.data.thickness)
			}
		} else {
			n.remove(o);
			alert("There's not enough room on the wall!");
			return
		}
	}
	n.updateWallDimensions()
};
const wallPartDragOver = function (t, o) {
	if (!(o instanceof window.go.Group)) return;
	if (o.data.isDivider) return;
	const e = t.diagram;
	let n = e.toolManager.draggingTool.draggedParts;
	if (n === null) {
		n = e.toolManager.draggingTool.copiedParts
	}
	if (n !== null) {
		n.iterator.each(function (t) {
			const e = t.key;
			if ((e.category === "WindowNode" || e.category === "DoorNode") && e.containingGroup === null) {
				const n = o.findObject("SHAPE");
				n.stroke = "lightblue";
				e.angle = o.rotateObject.angle
			}
		})
	}
};
const wallPartDragAway = function (t, e) {
	if (!(e instanceof window.go.Group)) return;
	const n = t.diagram;
	const o = e.findObject("SHAPE");
	if (o !== null) {
		o.stroke = "black";
		let t = n.toolManager.draggingTool.draggedParts;
		if (t === null) {
			t = n.toolManager.draggingTool.copiedParts
		}
		if (t !== null) {
			t.iterator.each(function (t) {
				const e = t.key;
				if ((e.category === "WindowNode" || e.category === "DoorNode") && e.containingGroup === null) {
					e.angle = 0
				}
			})
		}
	}
};

function makeWallGroup() {
	const t = window.go.GraphObject.make;
	return t(window.go.Group, "Spot", {
		contextMenu: makeContextMenu(),
		toolTip: makeGroupToolTip(),
		selectionObjectName: "SHAPE",
		rotateObjectName: "SHAPE",
		locationSpot: window.go.Spot.TopLeft,
		reshapable: true,
		minSize: new window.go.Size(1, 1),
		selectionAdorned: false,
		mouseDrop: addWallPart,
		mouseDragEnter: wallPartDragOver,
		mouseDragLeave: wallPartDragAway,
		dragComputation: function (i, t, e) {
			let o = i.location;
			const n = i.location.copy();
			const a = i.diagram;
			const r = a.toolManager.draggingTool;
			let s = 0;
			a.selection.iterator.each(function (t) {
				if (t.category === "WallGroup") {
					s++;
					if (t.data.key !== i.data.key) {}
				}
				if (t.category === "RoomNode") {
					t.isSelected = false
				}
			});
			if (s > 1) {
				return o
			}
			const l = a.grid.gridCellSize;
			e.x -= l.width / 2;
			e.y -= l.height / 2;
			const d = a.toolManager.mouseDownTools.elt(3);
			const c = new window.go.Map;
			const u = d.getAllWallsAtIntersection(i.data.startpoint, true);
			u.iterator.each(function (t) {
				if (t.data.key !== i.data.key) {
					if (d.pointsApproximatelyEqual(t.data.startpoint, i.data.startpoint)) {
						c.add(t.data.key, {
							connectedTo: "startpoint",
							connectedFrom: "startpoint"
						})
					} else if (d.pointsApproximatelyEqual(t.data.endpoint, i.data.startpoint)) {
						c.add(t.data.key, {
							connectedTo: "startpoint",
							connectedFrom: "endpoint"
						})
					}
				}
			});
			const g = d.getAllWallsAtIntersection(i.data.endpoint, true);
			g.iterator.each(function (t) {
				if (t.data.key !== i.data.key) {
					if (d.pointsApproximatelyEqual(t.data.startpoint, i.data.endpoint)) {
						c.add(t.data.key, {
							connectedTo: "endpoint",
							connectedFrom: "startpoint"
						})
					} else if (d.pointsApproximatelyEqual(t.data.endpoint, i.data.endpoint)) {
						c.add(t.data.key, {
							connectedTo: "endpoint",
							connectedFrom: "endpoint"
						})
					}
				}
			});
			const w = a.toolManager.draggingTool.isGridSnapEnabled ? e : t;
			const p = i;
			const f = new window.go.Set;
			moveAndUpdate(w);

			function moveAndUpdate(t) {
				const e = t.x - o.x;
				const n = t.y - o.y;
				a.model.set(i.data, "startpoint", new window.go.Point(i.data.startpoint.x + e, i.data.startpoint.y + n));
				a.model.set(i.data, "endpoint", new window.go.Point(i.data.endpoint.x + e, i.data.endpoint.y + n));
				d.performMiteringOnWall(p);
				c.iterator.each(function (t) {
					const e = t.key;
					const n = t.value;
					const o = a.findNodeForKey(e);
					if (o != null && o.data.key !== p.data.key) {
						a.model.set(o.data, n.connectedFrom, i.data[n.connectedTo]);
						d.performMiteringOnWall(o)
					}
				});
				d.performMiteringAtPoint(p.data.startpoint, true);
				d.performMiteringAtPoint(p.data.endpoint, true);
				o = p.location;
				c.iterator.each(function (t) {
					const e = a.findNodeForKey(t.key);
					f.add(e)
				});
				f.add(p);
				a.updateWallDimensions(f);
				a.updateWallAngles()
			}
			const m = a.findNodesByExample({
				category: "WallGroup"
			});
			m.iterator.each(function (t) {
				const e = t;
				if (p && p.data.key !== e.data.key && a.getWallsIntersection(p, e)) {
					if (!f.contains(e)) {
						moveAndUpdate(n);
						return n
					}
				}
			});
			return p.location
		},
		copyable: false
	}, t(window.go.Shape, {
		name: "SHAPE",
		fill: "lightgray",
		stroke: "black",
		strokeWidth: 1
	}, new window.go.Binding("fill", "color"), new window.go.Binding("stroke", "isSelected", function (t, e) {
		if (e.part.containingGroup != null) {
			const n = e.part.containingGroup;
			if (t) {
				n.data.isSelected = true
			}
		}
		return t ? "dodgerblue" : "black"
	}).ofObject()))
}

function makeTextureBrush(t) {
	const e = window.go.GraphObject.make;
	if (t === null || t === undefined) {
		t = "images/textures/floor1.jpg"
	}
	const n = new Image;
	n.src = t;
	return e(window.go.Brush, "Pattern", {
		pattern: n
	})
}

function makeTextureSelectionAdornment(e) {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, "Spot", {
		locationObjectName: "BIGPANEL"
	}, new window.go.Binding("location", "", function (t) {
		if (t.data.category === "RoomNode") {
			const e = t.adornedPart.findObject("ROOM_LABEL");
			const n = e.getDocumentPoint(window.go.Spot.BottomLeft);
			return n
		} else {
			return t.adornedPart.getDocumentPoint(window.go.Spot.BottomLeft)
		}
	}).ofObject(), new window.go.Binding("visible", "", function (t) {
		const e = t.adornedPart;
		if (e.category !== "RoomNode") {
			return e.data.usesTexture
		}
		return true
	}).ofObject(), t(window.go.Placeholder), t(window.go.Panel, "Horizontal", {
		name: "BIGPANEL"
	}, t("Button", {
		desiredSize: new window.go.Size(15, 15),
		click: function (t, e) {
			const n = e.part;
			const o = n.adornedPart;
			if (o !== null) {
				const i = o.diagram;
				i.model.setDataProperty(o.data, "showTextureOptions", !o.data.showTextureOptions);
				o.updateAdornments()
			}
		}
	}, new window.go.Binding("visible", "", function (t) {
		const e = t.adornedPart;
		if (e !== null && (e.diagram instanceof window.go.Palette || e.category === "RoomNode")) {
			return false
		}
		return true
	}).ofObject(), t(window.go.Shape, "TriangleLeft", {
		desiredSize: new window.go.Size(10, 10),
		name: "BUTTONSHAPE"
	}, new window.go.Binding("figure", "showTextureOptions", function (t) {
		return t ? "TriangleLeft" : "TriangleRight"
	}))), t(window.go.Panel, "Horizontal", {
		name: "PANEL",
		itemArray: e,
		itemTemplate: t("Button", {
			desiredSize: new window.go.Size(30, 30),
			click: function (t, e) {
				if (e.part === null || !(e instanceof window.go.Panel)) return;
				const n = e.part;
				const o = n.adornedPart;
				const i = e.findObject("BUTTON_IMAGE");
				const a = i.source;
				if (o.category === "RoomNode") {
					t.diagram.model.setDataProperty(o.data, "floorImage", a)
				} else {
					t.diagram.model.setDataProperty(o.data, "texture", a)
				}
			}
		}, t(window.go.Picture, {
			name: "BUTTON_IMAGE"
		}, new window.go.Binding("source", "", function (t, e) {
			if (typeof t !== "string") return "";
			return "./images/textures/" + t
		})))
	}, new window.go.Binding("visible", "", function (t) {
		const e = t.adornedPart;
		if (e.diagram instanceof window.go.Palette) return false;
		if (e.category === "RoomNode") {
			return e.data.showFlooringOptions
		} else {
			const n = t.findObject("BUTTONSHAPE");
			if (n !== null) {
				return n.figure === "TriangleLeft"
			}
		}
	}).ofObject(), new window.go.Binding("itemArray", "", function (t) {
		if (t.textures === undefined || t.textures === null) {
			return e
		} else {
			return t.textures
		}
	}))))
}

function makeRoomNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		contextMenu: makeContextMenu(),
		toolTip: makeGroupToolTip(),
		selectionObjectName: "SHAPE",
		rotateObjectName: "SHAPE",
		locationSpot: window.go.Spot.TopLeft,
		reshapable: true,
		copyable: false,
		minSize: new window.go.Size(1, 1),
		movable: false,
		selectionAdornmentTemplate: makeTextureSelectionAdornment(["floor1.jpg", "floor2.jpg", "floor3.jpg", "floor4.jpg", "floor5.jpg", "floor6.jpg", "floor7.jpg"]),
		locationObjectName: "SHAPE",
		layerName: "Background"
	}, new window.go.Binding("location", "isSelected", function (t, e) {
		const n = e.data.loc;
		if (t) {
			const o = e.findObject("SHAPE").strokeWidth;
			const i = new window.go.Point(n.x - o * 2, n.y - o * 2);
			return i
		} else {
			return n !== undefined ? n : e.location
		}
	}).ofObject(), t(window.go.Shape, {
		name: "SHAPE",
		fill: makeTextureBrush(null),
		stroke: "black",
		strokeWidth: 1
	}, new window.go.Binding("stroke", "isSelected", function (t, e) {
		if (e.part.containingGroup != null) {
			const n = e.part.containingGroup;
			if (t) {
				n.data.isSelected = true
			}
		}
		return t ? "dodgerblue" : "black"
	}).ofObject(), new window.go.Binding("strokeWidth", "isSelected", function (t, e) {
		return t ? 5 : 1
	}).ofObject(), new window.go.Binding("fill", "floorImage", function (t) {
		return makeTextureBrush(t)
	})), t(window.go.Panel, "Horizontal", {
		cursor: "move",
		name: "ROOM_LABEL",
		_isNodeLabel: true
	}, new window.go.Binding("alignment", "labelAlignment"), t(window.go.Panel, "Auto", new window.go.Binding("visible", "showLabel"), t(window.go.Shape, "RoundedRectangle", {
		fill: "beige",
		opacity: .5,
		stroke: null,
		strokeWidth: 3,
		name: "ROOM_LABEL_SHAPE"
	}, new window.go.Binding("stroke", "isSelected", function (t) {
		return t ? "dodgerblue" : null
	}).ofObject()), t(window.go.Panel, "Vertical", t(window.go.TextBlock, "Room Name", {
		editable: true,
		cursor: "text",
		font: "normal normal bold 13px sans-serif"
	}, new window.go.Binding("text", "name").makeTwoWay()), t(window.go.TextBlock, "Room Size", {
		name: "ROOM_LABEL_SIZE"
	}, new window.go.Binding("text", "", function (t) {
		const e = t.diagram;
		const n = e.getRoomArea(t);
		const o = e.convertPixelsToUnits(e.convertPixelsToUnits(n)).toFixed(2);
		return o + e.model.modelData.unitsAbbreviation + String.fromCharCode(178)
	}).ofObject()))), t("Button", {
		desiredSize: new window.go.Size(15, 15),
		click: function (t, e) {
			const n = e.part;
			if (n === null) return;
			t.diagram.model.setDataProperty(n.data, "showFlooringOptions", !n.data.showFlooringOptions);
			const o = t.diagram;
			o.select(n)
		},
		toolTip: t(window.go.Adornment, "Auto", t(window.go.Shape, {
			fill: "#FFFFCC"
		}), t(window.go.TextBlock, {
			margin: 4,
			text: "Show/ hide floor types"
		}))
	}, new window.go.Binding("visible", "isSelected").ofObject(), t(window.go.Shape, "TriangleDown", {
		desiredSize: new window.go.Size(10, 10)
	}, new window.go.Binding("figure", "showFlooringOptions", function (t) {
		return t ? "TriangleUp" : "TriangleDown"
	})))))
}

function getWallPartEndpoints(t) {
	const e = t.location;
	const n = t.data.length;
	let o = 0;
	if (t.containingGroup !== null) {
		const s = t.containingGroup;
		o = s.data.startpoint.directionPoint(s.data.endpoint)
	} else {
		o = 180
	}
	const i = new window.go.Point(e.x + n / 2, e.y);
	const a = new window.go.Point(e.x - n / 2, e.y);
	i.offset(-e.x, -e.y).rotate(o).offset(e.x, e.y);
	a.offset(-e.x, -e.y).rotate(o).offset(e.x, e.y);
	const r = new Array;
	r.push(i);
	r.push(a);
	return r
}

function getWallPartStretch(o) {
	const t = o.containingGroup;
	if (t === null) return;
	const e = t.data.startpoint.copy();
	const n = t.data.endpoint.copy();
	const i = new window.go.Set;
	const a = new window.go.Set;
	t.memberParts.iterator.each(function (t) {
		if (t.data.key !== o.data.key) {
			const e = getWallPartEndpoints(t);
			for (let t = 0; t < e.length; t++) {
				if (e[t].x < o.location.x || e[t].y > o.location.y && e[t].x === o.location.x) {
					i.add(e[t])
				} else {
					a.add(e[t])
				}
			}
		}
	});
	if (parseFloat(e.x.toFixed(2)) < parseFloat(o.location.x.toFixed(2)) || e.y > o.location.y && parseFloat(e.x.toFixed(2)) === parseFloat(o.location.x.toFixed(2))) {
		i.add(e)
	} else {
		a.add(e)
	}
	if (parseFloat(n.x.toFixed(2)) < parseFloat(o.location.x.toFixed(2)) || n.y > o.location.y && parseFloat(n.x.toFixed(2)) === parseFloat(o.location.x.toFixed(2))) {
		i.add(n)
	} else {
		a.add(n)
	}
	let r;
	let s = Number.MAX_VALUE;
	i.iterator.each(function (t) {
		const e = t;
		const n = Math.sqrt(e.distanceSquaredPoint(o.location));
		if (n < s) {
			s = n;
			r = e
		}
	});
	let l;
	let d = Number.MAX_VALUE;
	a.iterator.each(function (t) {
		const e = t;
		const n = Math.sqrt(e.distanceSquaredPoint(o.location));
		if (n < d) {
			d = n;
			l = e
		}
	});
	const c = {
		point1: r,
		point2: l
	};
	return c
}
const dragWallParts = function (t, e, n) {
	if (t.containingGroup !== null && t.containingGroup.category === "WallGroup") {
		const o = t.diagram;
		const i = t.containingGroup;
		const a = i.data.startpoint;
		const r = i.data.endpoint;
		const s = Math.sqrt(a.distanceSquaredPoint(t.location));
		const l = Math.sqrt(t.location.distanceSquaredPoint(r));
		const d = Math.sqrt(a.distanceSquaredPoint(r));
		if (s + l !== d) {
			t.location = t.location.copy().projectOntoLineSegmentPoint(a, r)
		}
		const c = getWallPartStretch(t);
		const u = c.point1;
		const g = c.point2;
		const w = Math.sqrt(u.distanceSquaredPoint(g));
		const p = t.data.length / 2;
		const f = new window.go.Point(u.x + p / w * (g.x - u.x), u.y + p / w * (g.y - u.y));
		const m = new window.go.Point(g.x + p / w * (u.x - g.x), g.y + p / w * (u.y - g.y));
		const h = Math.abs((r.y - a.y) * e.x - (r.x - a.x) * e.y + r.x * a.y - r.y * a.x) / Math.sqrt(Math.pow(r.y - a.y, 2) + Math.pow(r.x - a.x, 2));
		const y = 20 * i.data.thickness < 100 ? 20 * i.data.thickness : 100;
		if (h > y) {
			t.containingGroup = null;
			delete t.data.group;
			t.angle = 0;
			o.pointNodes.iterator.each(function (t) {
				o.remove(t)
			});
			o.dimensionLinks.iterator.each(function (t) {
				o.remove(t)
			});
			o.pointNodes.clear();
			o.dimensionLinks.clear();
			o.updateWallDimensions()
		}
		e = e.copy().projectOntoLineSegmentPoint(f, m);
		o.skipsUndoManager = true;
		o.startTransaction("set loc");
		o.model.setDataProperty(t.data, "loc", window.go.Point.stringify(e));
		o.commitTransaction("set loc");
		o.skipsUndoManager = false;
		o.updateWallDimensions()
	}
	return e
};

function makeWallPartResizeAdornment() {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, "Spot", {
		name: "WallPartResizeAdornment"
	}, t(window.go.Placeholder), t(window.go.Shape, {
		alignment: window.go.Spot.Left,
		cursor: "w-resize",
		figure: "Diamond",
		desiredSize: new window.go.Size(7, 7),
		fill: "#ffffff",
		stroke: "#808080"
	}), t(window.go.Shape, {
		alignment: window.go.Spot.Right,
		cursor: "e-resize",
		figure: "Diamond",
		desiredSize: new window.go.Size(7, 7),
		fill: "#ffffff",
		stroke: "#808080"
	}))
}

function makeDoorSelectionAdornment() {
	const t = window.go.GraphObject.make;
	return t(window.go.Adornment, "Vertical", {
		name: "DoorSelectionAdornment"
	}, t(window.go.Panel, "Auto", t(window.go.Shape, {
		fill: null,
		stroke: null
	}), t(window.go.Placeholder)), t(window.go.Panel, "Horizontal", {
		defaultStretch: window.go.GraphObject.Vertical
	}, t("Button", t(window.go.Picture, {
		source: "images/flipDoorOpeningLeft.png",
		column: 0,
		desiredSize: new window.go.Size(12, 12)
	}, new window.go.Binding("source", "", function (t) {
		if (t.adornedPart === null) {
			return "images/flipDoorOpeningRight.png"
		} else if (t.adornedPart.data.swing === "left") {
			return "images/flipDoorOpeningRight.png"
		} else {
			return "images/flipDoorOpeningLeft.png"
		}
	}).ofObject()), {
		click(t, e) {
			const n = e.part;
			if (n !== null && n.diagram !== null) {
				const o = n.diagram;
				o.startTransaction("flip door");
				const i = e.part;
				const a = i.adornedPart;
				if (a !== null) {
					if (a.data.swing === "left") {
						o.model.setDataProperty(a.data, "swing", "right")
					} else {
						o.model.setDataProperty(a.data, "swing", "left")
					}
					o.commitTransaction("flip door")
				}
			}
		},
		toolTip: t(window.go.Adornment, "Auto", t(window.go.Shape, {
			fill: "#FFFFCC"
		}), t(window.go.TextBlock, {
			margin: 4,
			text: "Flip Door Opening"
		}))
	}, new window.go.Binding("visible", "", function (t) {
		return t.adornedPart === null ? false : t.adornedPart.containingGroup !== null
	}).ofObject()), t("Button", t(window.go.Picture, {
		source: "images/flipDoorSide.png",
		column: 0,
		desiredSize: new window.go.Size(12, 12)
	}), {
		click(t, e) {
			const n = e.part;
			if (n !== null && n.diagram !== null) {
				const o = n.diagram;
				o.startTransaction("rotate door");
				const i = e.part;
				const a = i.adornedPart;
				a.angle = (a.angle + 180) % 360;
				o.commitTransaction("rotate door")
			}
		},
		toolTip: t(window.go.Adornment, "Auto", t(window.go.Shape, {
			fill: "#FFFFCC"
		}), t(window.go.TextBlock, {
			margin: 4,
			text: "Flip Door Side"
		}))
	}), new window.go.Binding("visible", "", function (t) {
		return t.adornedPart === null ? false : t.adornedPart.containingGroup !== null
	}).ofObject()))
}

function makeWindowNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		contextMenu: makeContextMenu(),
		selectionObjectName: "SHAPE",
		selectionAdorned: false,
		locationSpot: window.go.Spot.Center,
		toolTip: makeNodeToolTip(),
		minSize: new window.go.Size(5, 5),
		resizable: true,
		resizeAdornmentTemplate: makeWallPartResizeAdornment(),
		resizeObjectName: "SHAPE",
		rotatable: false,
		dragComputation: dragWallParts,
		layerName: "Foreground"
	}, new window.go.Binding("location", "loc", window.go.Point.parse).makeTwoWay(window.go.Point.stringify), new window.go.Binding("angle").makeTwoWay(), t(window.go.Shape, {
		name: "SHAPE",
		fill: "white",
		strokeWidth: 0
	}, new window.go.Binding("width", "length").makeTwoWay(), new window.go.Binding("height").makeTwoWay(), new window.go.Binding("stroke", "isSelected", function (t, e) {
		return t ? "dodgerblue" : "black"
	}).ofObject(), new window.go.Binding("fill", "isSelected", function (t, e) {
		return t ? "lightgray" : "white"
	}).ofObject()), t(window.go.Shape, {
		name: "LINESHAPE",
		fill: "darkgray",
		strokeWidth: 0,
		height: 10
	}, new window.go.Binding("width", "length", function (t, e) {
		return t - 10
	}), new window.go.Binding("height", "height", function (t, e) {
		return t / 5
	}), new window.go.Binding("stroke", "isSelected", function (t, e) {
		return t ? "dodgerblue" : "black"
	}).ofObject()))
}

function makeDoorNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		contextMenu: makeContextMenu(),
		selectionObjectName: "SHAPE",
		selectionAdornmentTemplate: makeDoorSelectionAdornment(),
		locationSpot: window.go.Spot.BottomCenter,
		resizable: true,
		resizeObjectName: "OPENING_SHAPE",
		toolTip: makeNodeToolTip(),
		minSize: new window.go.Size(10, 10),
		dragComputation: dragWallParts,
		resizeAdornmentTemplate: makeWallPartResizeAdornment(),
		layerName: "Foreground"
	}, new window.go.Binding("location", "loc", window.go.Point.parse).makeTwoWay(window.go.Point.stringify), new window.go.Binding("angle").makeTwoWay(), new window.go.Binding("locationSpot", "doorOpeningHeight", function (t, e) {
		return new window.go.Spot(.5, 1, 0, -(t / 2))
	}), t(window.go.Shape, {
		name: "SHAPE",
		fill: "rgba(0, 0, 0, 0)"
	}, new window.go.Binding("width", "length"), new window.go.Binding("height", "length").makeTwoWay(), new window.go.Binding("stroke", "isSelected", function (t, e) {
		return t ? "dodgerblue" : "black"
	}).ofObject(), new window.go.Binding("geometryString", "swing", function (t) {
		if (t === "left") {
			return "F1 M0,0 v-150 a150,150 0 0,1 150,150 "
		} else {
			return "F1 M275,175 v-150 a150,150 0 0,0 -150,150 "
		}
	})), t(window.go.Shape, {
		name: "OPENING_SHAPE",
		fill: "white",
		strokeWidth: 0,
		height: 5,
		width: 40,
		alignment: window.go.Spot.BottomCenter,
		alignmentFocus: window.go.Spot.Top
	}, new window.go.Binding("height", "doorOpeningHeight").makeTwoWay(), new window.go.Binding("stroke", "isSelected", function (t, e) {
		return t ? "dodgerblue" : "black"
	}).ofObject(), new window.go.Binding("fill", "isSelected", function (t, e) {
		return t ? "lightgray" : "white"
	}).ofObject(), new window.go.Binding("width", "length").makeTwoWay()))
}

function makePaletteWallNode() {
	const t = window.go.GraphObject.make;
	return t(window.go.Node, "Spot", {
		selectionAdorned: false
	}, t(window.go.Shape, {
		name: "SHAPE",
		fill: "black",
		strokeWidth: 0,
		height: 10,
		figure: "Rectangle"
	}, new window.go.Binding("width", "length").makeTwoWay(), new window.go.Binding("height").makeTwoWay(), new window.go.Binding("fill", "isSelected", function (t, e) {
		return t ? "dodgerblue" : "black"
	}).ofObject(), new window.go.Binding("stroke", "isSelected", function (t, e) {
		return t ? "dodgerblue" : "black"
	}).ofObject()))
}
const FURNITURE_NODE_DATA_ARRAY = [{
	category: "MultiPurposeNode",
	key: "MultiPurposeNode",
	caption: "Multi Purpose Node",
	color: "#ffffff",
	stroke: "#000000",
	name: "Writable Node",
	type: "Writable Node",
	shape: "Rectangle",
	text: "Write here",
	showLabel: true,
	width: 60,
	height: 60,
	notes: "",
	texture: "granite1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["wood1.jpg", "wood2.jpg", "granite1.jpg", "porcelain1.jpg", "steel1.jpg"]
}, {
	key: "roundTable",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Round Table",
	type: "Round Table",
	shape: "Ellipse",
	width: 61,
	height: 61,
	notes: "",
	texture: "wood1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["wood1.jpg", "wood2.jpg", "floor3.jpg", "granite1.jpg", "porcelain1.jpg"]
}, {
	key: "armChair",
	color: "purple",
	stroke: "#000000",
	caption: "Arm Chair",
	type: "Arm Chair",
	geo: "F1 M0 0 L40 0 40 40 0 40 0 0 M10 30 L10 10 M0 0 Q8 0 10 10 M0 40 Q20 15 40 40 M30 10 Q32 0 40 0 M30 10 L30 30",
	width: 45,
	height: 45,
	notes: "",
	texture: "fabric1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["fabric1.jpg", "fabric2.jpg", "fabric3.jpg"]
}, {
	key: "sofaMedium",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Sofa",
	type: "Sofa",
	geo: "F1 M0 0 L80 0 80 40 0 40 0 0 M10 35 L10 10 M0 0 Q8 0 10 10 M0 40 Q40 15 80 40 M70 10 Q72 0 80 0 M70 10 L70 35",
	height: 45,
	width: 90,
	notes: "",
	texture: "fabric2.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["fabric1.jpg", "fabric2.jpg", "fabric3.jpg"]
}, {
	key: "sink",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Sink",
	type: "Sink",
	geo: "F1 M0 0 L40 0 40 40 0 40 0 0z M5 7.5 L18.5 7.5 M 21.5 7.5 L35 7.5 35 35 5 35 5 7.5 M 15 21.25 A 5 5 180 1 0 15 21.24" + "M23 3.75 A 3 3 180 1 1 23 3.74 M21.5 6.25 L 21.5 12.5 18.5 12.5 18.5 6.25 M15 3.75 A 1 1 180 1 1 15 3.74" + "M 10 4.25 L 10 3.25 13 3.25 M 13 4.25 L 10 4.25 M27 3.75 A 1 1 180 1 1 27 3.74 M 26.85 3.25 L 30 3.25 30 4.25 M 26.85 4.25 L 30 4.25",
	width: 27,
	height: 27,
	notes: "",
	texture: "steel1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["copper1.jpg", "steel1.jpg", "steel2.jpg", "porcelain1.jpg"]
}, {
	key: "doubleSink",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Double Sink",
	type: "Double Sink",
	geo: "F1 M0 0 L75 0 75 40 0 40 0 0 M5 7.5 L35 7.5 35 35 5 35 5 7.5 M44 7.5 L70 7.5 70 35 40 35 40 9" + "M15 21.25 A5 5 180 1 0 15 21.24 M50 21.25 A 5 5 180 1 0 50 21.24 M40.5 3.75 A3 3 180 1 1 40.5 3.74" + "M40.5 3.75 L50.5 13.75 47.5 16.5 37.5 6.75 M32.5 3.75 A 1 1 180 1 1 32.5 3.74 M 27.5 4.25 L 27.5 3.25 30.5 3.25" + "M 30.5 4.25 L 27.5 4.25 M44.5 3.75 A 1 1 180 1 1 44.5 3.74 M 44.35 3.25 L 47.5 3.25 47.5 4.25 M 44.35 4.25 L 47.5 4.25",
	height: 27,
	width: 52,
	notes: "",
	texture: "steel2.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["copper1.jpg", "steel1.jpg", "steel2.jpg", "porcelain1.jpg"]
}, {
	key: "toilet",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Toilet",
	type: "Toilet",
	geo: "F1 M0 0 L25 0 25 10 0 10 0 0 M20 10 L20 15 5 15 5 10 20 10 M5 15 Q0 15 0 25 Q0 40 12.5 40 Q25 40 25 25 Q25 15 20 15",
	width: 25,
	height: 35,
	notes: "",
	texture: "porcelain1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["copper1.jpg", "steel1.jpg", "porcelain1.jpg"]
}, {
	key: "shower",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Shower/Tub",
	type: "Shower/Tub",
	geo: "F1 M0 0 L40 0 40 60 0 60 0 0 M35 15 L35 55 5 55 5 15 Q5 5 20 5 Q35 5 35 15 M22.5 20 A2.5 2.5 180 1 1 22.5 19.99",
	width: 45,
	height: 75,
	notes: "",
	texture: "copper1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["copper1.jpg", "steel1.jpg", "porcelain1.jpg"]
}, {
	key: "bed",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Bed",
	type: "Bed",
	geo: "F1 M0 0 L40 0 40 60 0 60 0 0 M 7.5 2.5 L32.5 2.5 32.5 17.5 7.5 17.5 7.5 2.5 M0 20 L40 20 M0 25 L40 25",
	width: 76.2,
	height: 101.6,
	notes: "",
	texture: "fabric3.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["fabric1.jpg", "fabric2.jpg", "fabric3.jpg"]
}, {
	key: "staircase",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Staircase",
	type: "Staircase",
	geo: "F1 M0 0 L 0 100 250 100 250 0 0 0 M25 100 L 25 0 M 50 100 L 50 0 M 75 100 L 75 0" + "M 100 100 L 100 0 M 125 100 L 125 0 M 150 100 L 150 0 M 175 100 L 175 0 M 200 100 L 200 0 M 225 100 L 225 0",
	width: 125,
	height: 50,
	notes: "",
	texture: "",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["wood1.jpg", "floor1.jpg", "wood2.jpg", "steel2.jpg", "floor2.jpg"]
}, {
	key: "stove",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Stove",
	type: "Stove",
	geo: "F1 M 0 0 L 0 100 100 100 100 0 0 0" + "M 30 15 A 15 15 180 1 0 30.01 15" + "M 30 20 A 10 10 180 1 0 30.01 20" + "M 30 25 A 5 5 180 1 0 30.01 25" + "M 70 15 A 15 15 180 1 0 70.01 15" + "M 70 20 A 10 10 180 1 0 70.01 20" + "M 70 25 A 5 5 180 1 0 70.01 25" + "M 30 55 A 15 15 180 1 0 30.01 55" + "M 30 60 A 10 10 180 1 0 30.01 60" + "M 30 65 A 5 5 180 1 0 30.01 65" + "M 70 55 A 15 15 180 1 0 70.01 55" + "M 70 60 A 10 10 180 1 0 70.01 60" + "M 70 65 A 5 5 180 1 0 70.01 65",
	width: 75,
	height: 75,
	notes: "",
	texture: "plaster1.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["steel1.jpg", "porcelain1.jpg", "copper1.jpg", "plaster1.jpg"]
}, {
	key: "diningTable",
	color: "#ffffff",
	stroke: "#000000",
	caption: "Dining Table",
	type: "Dining Table",
	geo: "F1 M 0 0 L 0 100 200 100 200 0 0 0 M 25 0 L 25 -10 75 -10 75 0 M 125 0 L 125 -10 175 -10 175 0" + " M 200 25 L 210 25 210 75 200 75 M 125 100 L 125 110 L 175 110 L 175 100 M 25 100 L 25 110 75 110 75 100 M 0 75 -10 75 -10 25 0 25",
	width: 125,
	height: 62.5,
	notes: "",
	texture: "wood2.jpg",
	usesTexture: true,
	showTextureOptions: true,
	textures: ["wood1.jpg", "wood2.jpg", "floor3.jpg", "granite1.jpg", "porcelain1.jpg", "steel2.jpg"]
}];
const WALLPARTS_NODE_DATA_ARRAY = [{
	category: "WindowNode",
	key: "window",
	color: "white",
	caption: "Window",
	type: "Window",
	shape: "Rectangle",
	height: 10,
	length: 60,
	notes: ""
}, {
	key: "door",
	category: "DoorNode",
	caption: "Door",
	type: "Door",
	length: 40,
	doorOpeningHeight: 5,
	swing: "left",
	notes: ""
}, {
	key: "floor",
	category: "FloorNode",
	src: "images/textures/floor1.jpg"
}];