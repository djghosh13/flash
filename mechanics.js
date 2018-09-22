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
			if (disp.len() < Disk.radius + Powerup.radius && disk.team !== 2) {
				this.capture[i]++
				if (this.mode === "KILL" && Math.random() < 0.5)
					this.capture[i]--
				// Probabilistic
				let probCapture = (this.capture[i] - 30) / 300
				if (disk.team !== this.team)
					probCapture = probCapture/5 - 0.01
				if (Math.random() < probCapture) {
					if (this.mode === "KILL" && disk.team !== this.team) {
						spawnPowerup(disk.team)
					} else {
						disk.mode = this.mode
						M.scores.give(disk.team,(disk.team === this.team) ? 1 : 5)
						removePowerup(this)
					}
				}
			}
			else if (this.capture[i] > 0)
				this.capture[i]--
		}
	}
}

class Scoreboard {
	/**
	 * Scoring System
	 * 
	 * Fixed points:
	 * 10 points for normal dash hit and initial stun (CHECK)
	 * 7 points for dash hit in poof mode (CHECK)
	 * 5 points for dash hit in chill mode (CHECK)
	 * 1 point for proximity boom
	 * 
	 * Style points:
	 * 1 point for intercepting opponent dash (start dash after opponent) (CHECK)
	 * 1 point per wall hit before dash stun (CHECK)
	 * 1 point for own powerup collect (CHECK)
	 * 5 points for opponent powerup steal (CHECK)
	 * 
	 * Point bonus:
	 * +25% points (rounded up) per player of deficit
	 * -50% points (rounded up) if opponent already stunned
	 * 
	 */
	constructor() {
		this.unused = [0, 0]
		this.total = [0, 0]
		this.possiblePoints = {}
	}
	get(team) {
		if (team === 0 || team === 1)
			return this.unused[team]
		return 0
	}
	getTotal(team) {
		if (team === 0 || team === 1)
			return this.total[team]
		return 0
	}
	give(team,points) {
		if (team === 0 || team === 1) {
			this.unused[team] += points
			this.total[team] += points
		}
	}
	consume(team,points) {
		if (team === 0 || team === 1)
			this.unused[team] = Math.max(this.unused[team] - points,0)
	}
	//
	handle(event,disk) {
		if (event === "DASH_START") {
			let points = 10
			if (disk.state.mode === "POOF") points -= 3
			if (Mechanics.special === "CHILL") points -= 5
			this.possiblePoints[disk] = points
		}
		else if (event === "DASH_END") {
			this.possiblePoints[disk] = 0
		}
		else if (event === "HIT_WALL") {
			if (this.possiblePoints[disk])
				this.possiblePoints[disk] += 1
		}
	}
	handleDiskHit(event0,disk0,event1,disk1) {
		if (disk0.team === disk1.team || disk0.team === 2 || disk1.team === 2)
			return
		if ((this.possiblePoints[disk0] && disk0 === Mechanics.disks[PlayerID]) || (this.possiblePoints[disk1] && disk1 === Mechanics.disks[PlayerID]))
			console.log("Player hit a disk!")
		if (this.possiblePoints[disk0] && this.possiblePoints[disk1]) {
			if (disk0.state.frame > disk1.state.frame)
				this.give(disk0.team,1)
			if (disk1.state.frame > disk0.state.frame)
				this.give(disk1.team,1)
		}
		else if (this.possiblePoints[disk0]) {
			this.give(disk0.team,this.possiblePoints[disk0])
			this.possiblePoints[disk0] = 0
		}
		else if (this.possiblePoints[disk1]) {
			this.give(disk1.team,this.possiblePoints[disk1])
			this.possiblePoints[disk1] = 0
		}
	}
	update() {
		let M = Mechanics
		// TODO - Check events to see how many points to grant
		// TODO - Check points to see if a powerup should be spawned
		let numPowers = [0, 0]
		foreachPower(p => numPowers[p.team] += 1)
		if (numPowers[0] < 2 && Math.random() < 1/300)
			spawnPowerup(0)
		if (numPowers[1] < 2 && Math.random() < 1/300)
			spawnPowerup(1)
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
		specFrames: 0,
		scores: new Scoreboard()
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

powerupGenerator = (function *() {
	let names = ["BANG","BOOM","POOF","CHILL"]
	let pups = []
	for (let i=0; i<names.length; i++) {
		let idx = Math.floor((1 + i) * Math.random())
		pups.splice(idx,0,i)
	}
	while (true) {
		let next = pups.shift()
		yield names[next]
		let idx = Math.floor(1 + pups.length*Math.random())
		pups.splice(idx,0,next)
	}
})()

function spawnPowerup(team, kill=false) {
	let pos = V(Powerup.radius + (150 - 2*Powerup.radius)*Math.random(),
			Powerup.radius + (80 - 2*Powerup.radius)*Math.random())
	let mode
	if (kill) mode = "KILL"
	else mode = powerupGenerator.next().value
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
		M.scores.handle("HIT_WALL",disk)
	}
	if (disk.position.y - Disk.radius < 0 || disk.position.y + Disk.radius > M.height) {
		disk.velocity.y = -BOUNCE*disk.velocity.y
		disk.position.y = constrain(disk.position.y, Disk.radius, M.height - Disk.radius)
		disk.handle("HIT_WALL")
		M.scores.handle("HIT_WALL",disk)
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
				let iEvent = (iImpact > 115) ? "HIT_DISK_HARD" : "HIT_DISK_SOFT"
				let jEvent = (jImpact > 115) ? "HIT_DISK_HARD" : "HIT_DISK_SOFT"
				M.disks[i].handle(iEvent)
				disk.handle(jEvent)
				M.scores.handleDiskHit(iEvent,M.disks[i],jEvent,disk)
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