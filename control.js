function control(disk) {
	if (disk.control !== null)
		disk.control.getInput(disk)
}

// Mouse/Keyboard
class MKInput {
	constructor() {
		this.mouse = V(75,40)
		this.lmb = 0
		this.rmb = 0
		this.keys = new Set()

		let data = { input: this }
		$(document).mousemove(data, function(event) {
			event.data.input.mouse.x = (event.pageX - Screen.offsetLeft)/Graphics.SCALE - 4.5
			event.data.input.mouse.y = (event.pageY - Screen.offsetTop)/Graphics.SCALE - 4.5
		}).mousedown(data, function(event) {
			if (event.which === 1)
				event.data.input.lmb = 1
			else
				event.data.input.rmb = 1
		}).mouseup(data, function(event) {
			if (event.which === 1)
				event.data.input.lmb = 0
			else
				event.data.input.rmb = 0
		}).keydown(data, function(event) {
			const mapping = { W:"UP", A:"LEFT", S:"DOWN", D:"RIGHT" }
			if (String.fromCharCode(event.which) in mapping)
				event.data.input.keys.add(mapping[String.fromCharCode(event.which)])
		}).keyup(data, function(event) {
			const mapping = { W:"UP", A:"LEFT", S:"DOWN", D:"RIGHT" }
			if (String.fromCharCode(event.which) in mapping)
				event.data.input.keys.delete(mapping[String.fromCharCode(event.which)])
		}).contextmenu(false)
	}
	handle(eventID) { }
	getInput(disk) {
		// Movement
		let x = this.keys.has("RIGHT") - this.keys.has("LEFT")
		let y = this.keys.has("UP") - this.keys.has("DOWN")
		disk.input = [x,y]
		// Rotation
		disk.target = this.mouse.sub(disk.position).angle()
		// Dash
		if (this.lmb === 1) {
			this.lmb = -1
			disk.dash = true
		}
		if (this.rmb === 1) {
			this.rmb = -1
			disk.special = true
		}
	}
}
/* Touch - DO LATER
class TouchInput {
	constructor() {
		this.touch = []

		let TouchLeft = document.getElementById("touch-left")
		$(TouchLeft).css("display","block")
		let size = 0.2*Screen.height
		TouchLeft.height = 2*size
		TouchLeft.width = 2*size
		this.G = TouchLeft.getContext('2d')
		this.G.fillStyle = "#fff6"
		this.G.arc(size,size,size,0,2*Math.PI)
		this.G.fill()
	}
	handle(eventID) { }
	getInput(disk) {

	}
}
*/

// AI Utils
function nearestNeighbor(disk,filter=(x=>true)) {
	let M = Mechanics
	let closest = null
	let dist2 = -1
	for (let i=0; i<M.disks.length; i++) {
		let d = M.disks[i]
		if (disk !== d && filter(d) && d.state.mode !== "POOF" &&
				(closest === null || disk.position.sub(d.position).len2() < dist2)) {
			closest = d
			dist2 = disk.position.sub(d.position).len2()
		}
	}
	return closest
}

// Simple AI
class CircleAI {
	constructor() { }
	handle(eventID) { }
	getInput(disk) {
		let angle = -V(disk.position.y/40 - 1,1 - disk.position.x/75).angle()
		let ax,ay
		if (-Math.PI/3 < angle && angle < Math.PI/3) ax = 1
		else if (angle < -2*Math.PI/3 || angle > 2*Math.PI/3) ax = -1
		if (Math.PI/6 < angle && angle < 5*Math.PI/6) ay = 1
		else if (-Math.PI/6 > angle && angle > -5*Math.PI/6) ay = -1
		disk.input = [ax,ay]
		// Nearest opponent
		let nearest = nearestNeighbor(disk,(x => x.team === 1 - disk.team))
		let target = (nearest !== null) ? nearest.position : V(75,40)
		disk.target = target.sub(disk.position).angle()
		if (Math.random() < 1/60/3)
			disk.dash = true
	}
}
// Tracking AI
class SeekingAI {
	constructor() { }
	handle(eventID) { }
	getInput(disk) {
		let nearest = nearestNeighbor(disk,(x => x.team === 1 - disk.team))
		let target = (nearest !== null) ? nearest.position : V(75,40)
		let direction = target.sub(disk.position).angle()
		// Set movement based on direction
		let ax = 0
		let ay = 0
		if (Math.random() < Math.abs(Math.cos(direction)))
			ax = (Math.abs(direction) < 0.5*Math.PI) ? 1 : -1
		if (Math.random() < Math.abs(Math.sin(direction)))
			ay = (direction < 0) ? 1 : -1
		disk.input = [ax,ay]
		disk.target = direction
		if (Math.random() < 1/60/2.2)
			disk.dash = true
	}
}
// Anti-Gravity AI
class AntiAI {
	constructor() { }
	handle(eventID) { }
	getInput(disk) {
		const Wx = 100
		const Wy = 100
		const D = 30
		let force = V(Wx*(Math.pow(disk.position.x,-3) - Math.pow(150 - disk.position.x,-3)),
				Wy*(Math.pow(disk.position.y,-3) - Math.pow(80 - disk.position.y,-3)))
		disk.target = V(75,40).sub(disk.position).angle()
		// Gravity points
		let nearest = nearestNeighbor(disk,(x => x.team === 1 - disk.team))
		let second = nearestNeighbor(disk,(x => x.team === 1 - disk.team && x !== nearest))
		let friend = nearestNeighbor(disk,(x => x.team === disk.team))
		if (nearest !== null) {
			let disp = nearest.position.sub(disk.position)
			let dforce = (Math.pow(D/disp.len(),2) - Math.pow(D/disp.len(),3))
			force = force.add(disp.norm(dforce))
			disk.target = disp.angle()
		}
		if (second !== null) {
			let disp = second.position.sub(disk.position)
			let dforce = -0.5*Math.pow(D/disp.len(),2)
			force = force.add(disp.norm(dforce))
		}
		if (friend !== null) {
			let disp = friend.position.sub(disk.position)
			let dforce = 0.1*(Math.pow(D/disp.len(),2) - Math.pow(D/disp.len(),3))
			force = force.add(disp.norm(dforce))
		}
		// Set movement based on direction
		let direction = force.angle()
		if (force.len2() > 0.0001) {
			let ax = 0
			let ay = 0
			if (Math.random() < Math.abs(Math.cos(direction)))
				ax = (Math.abs(direction) < 0.5*Math.PI) ? 1 : -1
			if (Math.random() < Math.abs(Math.sin(direction)))
				ay = (direction < 0) ? 1 : -1
			disk.input = [ax,ay]
			if (Math.random() < 1/60/2.2)
				disk.dash = true
		}
	}
}

// Super Smart AI?
class SmartAI {
	constructor() { }
	handle(eventID) { }
	getInput(disk) {

	}
}