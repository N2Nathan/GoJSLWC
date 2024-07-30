export class NodeLabelDraggingTool extends window.go.Tool {
	constructor(t) {
		super();
		this.name = "NodeLabelDragging";
		this.label = null;
		this._offset = new window.go.Point;
		this._originalAlignment = null;
		this._originalCenter = null;
		if (t) Object.assign(this, t)
	}
	canStart() {
		if (!super.canStart()) return false;
		const t = this.diagram;
		if (t === null) return false;
		const e = t.lastInput;
		if (!e.left) return false;
		if (!this.isBeyondDragSize()) return false;
		return this.findLabel() !== null
	}
	findLabel() {
		const t = this.diagram;
		const e = t.firstInput;
		let i = t.findObjectAt(e.documentPoint, null, null);
		if (i === null || !(i.part instanceof window.go.Node)) return null;
		if (i.part instanceof window.go.Node) {
			i.part.isSelected = true
		}
		while (i.panel !== null) {
			if (i._isNodeLabel && i.panel.type === window.go.Panel.Spot && i.panel.findMainElement() !== i) return i;
			i = i.panel
		}
		return null
	}
	doActivate() {
		this.startTransaction("Shifted Label");
		this.label = this.findLabel();
		if (this.label !== null) {
			this._offset = this.diagram.firstInput.documentPoint.copy().subtract(this.label.getDocumentPoint(window.go.Spot.Center));
			this._originalAlignment = this.label.alignment.copy();
			if (this.label !== null && this.label.panel !== null) {
				const t = this.label.panel.findMainElement();
				if (t !== null) {
					this._originalCenter = t.getDocumentPoint(window.go.Spot.Center)
				}
			}
		}
		super.doActivate()
	}
	doDeactivate() {
		super.doDeactivate();
		this.stopTransaction()
	}
	doStop() {
		this.label = null;
		super.doStop()
	}
	doCancel() {
		if (this.label !== null && this._originalAlignment !== null) {
			const t = this.label.part;
			this.diagram.model.set(t.data, "labelAlignment", this._originalAlignment)
		}
		super.doCancel()
	}
	doMouseMove() {
		if (!this.isActive) return;
		this.updateAlignment()
	}
	doMouseUp() {
		if (!this.isActive) return;
		this.updateAlignment();
		this.transactionResult = "Shifted Label";
		this.stopTool()
	}
	updateAlignment() {
		if (this.label === null) return;
		const t = this.diagram.lastInput.documentPoint;
		const e = this._originalCenter;
		if (e !== null) {
			const i = new window.go.Spot(.5, .5, t.x - this._offset.x - e.x, t.y - this._offset.y - e.y);
			const n = this.label.part;
			this.diagram.model.set(n.data, "labelAlignment", i)
		}
	}
}