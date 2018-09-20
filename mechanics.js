class Disk {
	static get radius() { return 4.5 }
	constructor(pos,team,control) {
		// Physics
		this.position = pos
		this.velocity = V()
		this.direction = 0
		// Input
		this.accel = V()
		this.turndir = 0
		this.dash = false
		this.special = false
		// Logistics
		this.team = team
		this.control = control
		this.state = new MoveState(this)
		this.mode = "NONE"
	}
	handle(event) {
		if (this.state !== null)
			this.state = this.state.handle(event)
		if (this.control !== null)
			this.control.handle(event)
	}
	set input(value) {
		let mvt = V()
		if (value[0] > 0) mvt.x = 1
		else if (value[0] < 0) mvt.x = -1
		if (value[1] > 0) mvt.y = -1
		else if (value[1] < 0) mvt.y = 1
		this.accel = mvt.norm(this.state.ACCELERATION)
	}
	set target(value) {
		if (value === -2) return
		this.turndir = value
	}
}

class Powerup {
	static get radius() { return 3 }
	constructor(pos,mode,team) {
		this.position = pos
		this.mode = mode
		this.team = team
		this.capture = []
		for (let i=0; i<Mechanics.disks.length; i++) {
			this.capture.push(0)
		}
	}
	update() {
		let M = Mechanics
		for (let i=0; i<M.disks.length; i++) {
			let disk = M.disks[i]
			let disp = disk.position.sub(this.position)
			if (disp.len() < Disk.radius + Powerup.radius) {
				this.capture[i]++
				if (this.mode === "KILL" && Math.random() < 0.5)
					this.capture[i]--
				// Probabilistic
				let probCapture = (this.capture[i] - 30) / 300
				if (disk.team !== this.team)
					probCapture = probCapture / 3
				if (Math.random() < probCapture) {
					disk.mode = this.mode
					removePowerup(this)
				}
			}
			else if (this.capture[i] > 0)
				this.capture[i]--
		}
	}
}

function setupMechanics() {
	Mechanics = {
		width: 150,
		height: 80,
		delta: 0.01667,
		disks: [],
		powers: [],
		special: "NONE",
		specFrames: 0
	}
}

function foreach(callback) {
	let M = Mechanics
	for (let i=0; i<M.disks.length; i++) {
		callback(M.disks[i])
	}
}

function foreachPower(callback) {
	let M = Mechanics
	for (let i=0; i<M.powers.length; i++) {
		callback(M.powers[i])
	}
}

function spawn(x,y,t,c=null) {
	let M = Mechanics
	M.disks.push(new Disk(V(x,y),t,c))
	resolveAllCollision()
}

function update(disk) {
	let M = Mechanics
	// Update State
	disk.state = disk.state.update()
	// Movement
	disk.velocity = disk.velocity.add(disk.accel.mul(M.delta))
	disk.position = disk.position.add(disk.velocity.mul(M.delta))
	// Rotation
	let turnAmt = disk.state.TURN_RATE*M.delta
	let targAmt = A(disk.turndir - disk.direction)
	if (Math.abs(targAmt) < turnAmt)
		disk.direction = disk.turndir
	else if (targAmt > 0)
		disk.direction = A(disk.direction + turnAmt)
	else
		disk.direction = A(disk.direction - turnAmt)
}

function spawnPowerup(team) {
	let pos = V(Powerup.radius + (150 - 2*Powerup.radius)*Math.random(),
			Powerup.radius + (80 - 2*Powerup.radius)*Math.random())
	let mode = ["BANG","POOF","BOOM","CHILL","KILL"][Math.floor(5*Math.random())]
	Mechanics.powers.push(new Powerup(pos,mode,team))
}
function removePowerup(powerup) {
	let M = Mechanics
	for (let i=0; i<M.powers.length; i++) {
		if (M.powers[i] === powerup) {
			M.powers.splice(i,1)
			break
		}
	}
}

function applyFriction(disk) {
	const FRICTION_MIN = 30
	const FRICTION_MAX = 130
	const MAX_SPEED = disk.state.MAX_SPEED
	let M = Mechanics
	let fric
	if (disk.velocity.len2() > MAX_SPEED*MAX_SPEED)
		fric = disk.velocity.norm(FRICTION_MAX*M.delta)
	else
		fric = disk.velocity.norm(FRICTION_MIN*M.delta)
	if (disk.velocity.len2() < fric.len2()) disk.velocity = V()
	else disk.velocity = disk.velocity.sub(fric)
}

function resolveWallCollision(disk) {
	const BOUNCE = 0.8
	let M = Mechanics
	if (disk.position.x - Disk.radius < 0 || disk.position.x + Disk.radius > M.width) {
		disk.velocity.x = -BOUNCE*disk.velocity.x
		disk.position.x = constrain(disk.position.x, Disk.radius, M.width - Disk.radius)
		disk.handle("HIT_WALL")
	}
	if (disk.position.y - Disk.radius < 0 || disk.position.y + Disk.radius > M.height) {
		disk.velocity.y = -BOUNCE*disk.velocity.y
		disk.position.y = constrain(disk.position.y, Disk.radius, M.height - Disk.radius)
		disk.handle("HIT_WALL")
	}
}

function resolveDiskCollision(disk) {
	const BOUNCE = 1.1
	const ELASTICITY = 0.9
	let M = Mechanics
	let j = M.disks.length
	for (let i=0; i<M.disks.length; i++) {
		if (M.disks[i] === disk) j = i
		if (j < i) {
			let disp = disk.position.sub(M.disks[i].position).mul(0.5)
			if (disp.len2() < Disk.radius*Disk.radius) {
				// Fix position
				let shift = disp.norm(1.05*Disk.radius)
				if (shift.len2 === 0) shift = V(Disk.radius,0)
				M.disks[i].position = M.disks[i].position.add(disp).sub(shift)
				disk.position = disk.position.sub(disp).add(shift)
				// Velocity normal to collision point
				let norm = shift.norm()
				let iVelocity = M.disks[i].velocity.dot(norm)
				let jVelocity = disk.velocity.dot(norm)
				// Impulse of impact
				let iDelta = BOUNCE*jVelocity*disk.state.MASS/M.disks[i].state.MASS - iVelocity
				let jDelta = BOUNCE*iVelocity*M.disks[i].state.MASS/disk.state.MASS - jVelocity
				M.disks[i].velocity = M.disks[i].velocity.add(norm.mul(ELASTICITY*iDelta))
				disk.velocity = disk.velocity.add(norm.mul(ELASTICITY*jDelta))
				// Calculate hit power
				let totalImpact = Math.abs(iVelocity*M.disks[i].state.MASS - jVelocity*disk.state.MASS)
				let iImpact = Math.abs(jVelocity*disk.state.MASS/M.disks[i].state.MASS)
				let jImpact = Math.abs(iVelocity*M.disks[i].state.MASS/disk.state.MASS)
				if (M.disks[i].team === disk.team) {
					iImpact *= 0.4
					jImpact *= 0.4
				}
				M.disks[i].handle((iImpact > 115) ? "HIT_DISK_HARD" : "HIT_DISK_SOFT")
				disk.handle((jImpact > 115) ? "HIT_DISK_HARD" : "HIT_DISK_SOFT")
			}
		}
	}
}

function resolveAllCollision() {
	let M = Mechanics
	let recheck = false
	for (let i=1; i<M.disks.length; i++) {
		for (let j=0; j<i; j++) {
			let disp = M.disks[j].position.sub(M.disks[i].position).mul(0.5)
			if (disp.len2() < Disk.radius*Disk.radius) {
				recheck = true
				let shift = disp.norm(1.05*Disk.radius)
				if (shift.len2() === 0) shift = V(Disk.radius,0)
				M.disks[i].position = M.disks[i].position.add(disp).sub(shift)
				M.disks[j].position = M.disks[j].position.sub(disp).add(shift)
			}
		}
	}
	if (recheck) resolveAllCollisions()
}

function setSpecial(mode) {
	let M = Mechanics
	M.special = mode
	M.specFrames = (M.special === "NONE") ? 0 : 30
}