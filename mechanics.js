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
	get dead() {
		return this.team === 2
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
		for (let i=0; i<numDisks(); i++) {
			this.capture.push(0)
		}
	}
	update() {
		let M = Mechanics
		for (let i=0; i<numDisks(); i++) {
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
						M.scores.give(disk.team,(disk.team === this.team) ? 1 : 10)
					}
					removePowerup(this)
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
	 * 5 points for normal dash hit and initial stun (CHECK)
	 * 1 point for proximity boom
	 * 
	 * Style points:
	 * 1 point for intercepting opponent dash (start dash after opponent) (CHECK)
	 * 2 points per wall hit before dash stun (CHECK)
	 * 1 point for own powerup collect (CHECK)
	 * 10 points for opponent powerup steal (CHECK)
	 * 
	 * Point bonus:
	 * +25% points (rounded up) per player of deficit
	 * 
	 */
	constructor() {
		this.unused = [0, 0]
		this.total = [0, 0]
		this.possiblePoints = new Map()
		this.KILL_THRESH = 1200
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
			let multiplier = 12 / foreach(none,onTeam(team)).length
			this.unused[team] += points * multiplier
			this.total[team] += points * multiplier
		}
	}
	consume(team,points) {
		if (team === 0 || team === 1)
			this.unused[team] = Math.max(this.unused[team] - points,0)
	}
	//
	handle(event,disk) {
		if (event === "DASH_START") {
			let points = 5
			this.possiblePoints.set(disk,points)
		}
		else if (event === "DASH_END") {
			this.possiblePoints.set(disk,0)
		}
		else if (event === "HIT_WALL") {
			if (this.possiblePoints.get(disk))
				this.possiblePoints.set(disk,this.possiblePoints.get(disk) + 2)
		}
	}
	handleDiskHit(event0,disk0,event1,disk1) {
		if (disk0.team === disk1.team || disk0.dead || disk1.dead)
			return
		if (!event0.endsWith("HARD") && !event1.endsWith("HARD"))
			return
		if (this.possiblePoints.get(disk0) && this.possiblePoints.get(disk1)) {
			if (disk0.state.frame > disk1.state.frame)
				this.give(disk0.team,1)
			if (disk1.state.frame > disk0.state.frame)
				this.give(disk1.team,1)
		}
		else if (this.possiblePoints.get(disk0)) {
			this.give(disk0.team,this.possiblePoints.get(disk0))
			this.possiblePoints.set(disk0,0)
		}
		else if (this.possiblePoints.get(disk1)) {
			this.give(disk1.team,this.possiblePoints.get(disk1))
			this.possiblePoints.set(disk1,0)
		}
	}
	update() {
		let M = Mechanics
		// Spawn regular powerups
		let numPowers = [foreachPower(none,onTeam(0)).length,foreachPower(none,onTeam(1)).length]
		if (numPowers[0] < 2 && Math.random() < 1/300)
			spawnPowerup(0)
		if (numPowers[1] < 2 && Math.random() < 1/300)
			spawnPowerup(1)
		// Spawn KILL powerups
		let numKills = foreachPower(none,(p => p.mode === "KILL")).length
		if (this.unused[0]+this.unused[1] > this.KILL_THRESH &&
				2*numKills <= numDisks() && Math.random() < 0.01) {
			let total = this.unused[0]*this.unused[0] + this.unused[1]*this.unused[1]
			let prob0 = this.unused[0]*this.unused[0] / total
			if (Math.random() < prob0) {
				spawnPowerup(0,true)
				this.unused[0] = 0
				this.unused[1] = Math.floor(this.unused[1] / 2)
			} else {
				spawnPowerup(1,true)
				this.unused[0] = Math.floor(this.unused[0] / 2)
				this.unused[1] = 0
			}
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
		specFrames: 0,
		scores: new Scoreboard()
	}
}

function foreach(callback,condition=none) {
	let M = Mechanics
	result = []
	for (let i=0; i<numDisks(); i++) {
		if (condition(M.disks[i]))
			result.push(callback(M.disks[i]))
	}
	return result
}

function foreachPower(callback,condition=none) {
	let M = Mechanics
	let result = []
	for (let i=0; i<M.powers.length; i++) {
		if (condition(M.powers[i]))
			result.push(callback(M.powers[i]))
	}
	return result
}

function numDisks(team=-1) {
	if (team === -1)
		return Mechanics.disks.length
	return foreach(none,onTeam(team)).length
}

function onTeam(team) {
	if (team === -1)
		return none
	return x => x.team === team
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
	let j = numDisks()
	for (let i=0; i<numDisks(); i++) {
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
	for (let i=1; i<numDisks(); i++) {
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