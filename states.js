class State {
	constructor(disk) {
		this.disk = disk
	}
	handle(event) { return this }
	update() { return this }

	get MAX_SPEED() { return 30 }
	get TURN_RATE() { return 2.3 }
	get ACCELERATION() { return 100 }
	get MASS() { return 1 }

	get G_ALPHA() { return '9' }
	get G_PARAM_A() { return 0.1 }
	get G_PARAM_B() { return 0.75 }
}

class MoveState extends State {
	constructor(disk) {
		super(disk)
		this.mode = "NONE"
		this.frame = -1
		Mechanics.scores.handle("DASH_END",disk)
	}
	handle(event) {
		if (event === "HIT_DISK_HARD")
			return new StunState(this.disk,60)
		return this
	}
	update() {
		if (this.frame > 0) this.frame--
		if (this.disk.dash === true)
			return new DashState(this.disk)
		else if (this.disk.special === true && this.frame === -1) {
			this.mode = this.disk.mode
			if (this.mode !== "NONE")
				setSpecial(this.mode)
			this.disk.mode = "NONE"
		}
		if (this.frame === 0) {
			this.frame = -1
			this.mode = "NONE"
		}
		this.disk.special = false
		// Special
		if (this.mode === "POOF") {
			if (this.frame === -1) this.frame = 300
			if (this.frame > 270)
				specialFill("#0003")
		}
		if (this.mode === "BOOM") {
			if (this.frame === -1) this.frame = 30
			if (this.frame === 10) {
				let position = this.disk.position
				let team = this.disk.team
				foreach(function(disk) {
					let disp = disk.position.sub(position)
					let dist = Math.max(disp.len()/30,1)
					let force = disp.norm(300/dist)
					if (disk.team === team)
						force = force.mul(0.5)
					else if (dist === 1)
						Mechanics.scores.give(team,2)
					disk.velocity = disk.velocity.add(force)
					disk.state = new StunState(disk,Math.floor(0.4*force.len()))
				})
			}
			if (this.frame <= 10)
				specialCircle(this.disk.position,"#f63",30 + 10*(10 - this.frame))
		}
		if (this.mode === "BANG") {
			if (this.frame === -1) this.frame = 30
			if (this.frame === 10) {
				let team = this.disk.team
				foreach(function(disk) {
					if (disk.team !== team)
						disk.state = new StunState(disk,120)
				})
			}
			if (this.frame <= 10)
				specialFill("#fff" + "6789abcdef"[this.frame - 1])
		}
		if (this.mode === "CHILL") {
			if (this.frame === -1) this.frame = 240
			specialFill("#36f3")
			let team = this.disk.team
			if (this.frame === 240) {
				foreach(function(disk) {
					if (disk.team !== team)
						disk.state = new ChillState(disk,240)
				})
			}
		}
		if (this.mode === "KILL") {
			if (this.frame === -1) this.frame = 120
			specialFill("#f006")
			let user = this
			if (this.frame === 120)
				foreach(function(disk) {
					if (disk !== user)
						disk.state = new KillState(disk,120)
				})
		}
		return this
	}
	get MAX_SPEED() {
		if (this.mode === "POOF")
			return 75
		return (this.mode === "NONE") ? 60 : 50
	}
	get TURN_RATE() {
		if (this.mode === "POOF")
			return 40
		return (this.mode === "NONE") ? 2.3 : 1.3
	}
	get ACCELERATION() {
		if (this.mode === "POOF")
			return 110
		return (this.mode === "NONE") ? 100 : 50
	}
	get G_ALPHA() {
		if (this.mode === "POOF") return '2'
		if (this.mode === "BANG") return 'f'
		return '9'
	}
}

class StunState extends State {
	constructor(disk,frames) {
		super(disk)
		disk.dash = false
		this.frame = frames
		Mechanics.scores.handle("DASH_END",disk)
	}
	handle(event) {
		if (event === "HIT_DISK_HARD")
			this.frame = this.frame + 30
		return this
	}
	update() {
		this.frame--
		if (this.frame <= 0)
			return new MoveState(this.disk)
		if (this.frame > 10) {
			this.disk.dash = false
			this.disk.special = false
		}
		return this
	}
	get TURN_RATE() { return 1.3 }
	get ACCELERATION() { return 50 }
	get MASS() { return 0.8 }
	get G_ALPHA() { return (Math.floor(this.frame/6)%2 === 0) ? '6' : 'c' }
	get G_PARAM_A() { return 0.1 }
	get G_PARAM_B() { return 0.5 }
}

class ChillState extends State {
	constructor(disk,frames) {
		super(disk)
		disk.velocity = disk.velocity.mul(0.3)
		disk.accel = V()
		disk.dash = false
		this.frame = frames
		Mechanics.scores.handle("DASH_END",disk)
	}
	handle(event) {
		if (event === "HIT_DISK_HARD")
			return new StunState(this.disk,this.frame + 15)
		return this
	}
	update() {
		this.frame--
		if (this.frame === 0)
			return new MoveState(this.disk)
		this.disk.dash = false
		return this
	}
	get MAX_SPEED() { return 6 }
	get TURN_RATE() { return 0.3 }
	get ACCELERATION() { return 30 }
}

class KillState extends State {
	constructor(disk,frames) {
		super(disk)
		disk.velocity = V()
		disk.accel = V()
		disk.dash = false
		disk.special = false
		this.frame = frames
		Mechanics.scores.handle("DASH_END",disk)
	}
	handle(event) {
		if (event === "HIT_DISK_HARD") {
			spawnPowerup(this.disk.team, true)
			this.disk.control = null
			this.disk.team = 2
			return new MoveState(this.disk)
		}
		return this
	}
	update() {
		this.frame--
		if (this.frame === 0)
			return new MoveState(this.disk)
		this.disk.dash = false
		this.disk.special = false
		return this
	}
	get TURN_RATE() { return 0.5 }
	get ACCELERATION() { return 20 }
}

class DashState extends State {
	constructor(disk) {
		super(disk)
		this.frame = 120
		Mechanics.scores.handle("DASH_START",disk)
	}
	handle(event) {
		if (event.startsWith("HIT_DISK") && this.frame > 95)
			this.frame = 95
		if (event === "HIT_DISK_HARD" && this.frame < 80)
			return new StunState(this.disk,this.frame + 30)
		return this
	}
	update() {
		this.frame--
		if (this.frame === 0)
			return new MoveState(this.disk)
		if (this.frame > 10) {
			this.disk.dash = false
			this.disk.special = false
		}
		if (this.frame > 95) {
			let dir = V(Math.cos(this.disk.direction),Math.sin(this.disk.direction))
			let t = (this.frame - 100)*75
			this.disk.velocity = this.disk.velocity.add(dir.mul(Mechanics.delta*t))
		}
		return this
	}
	get MAX_SPEED() {
		return (this.frame > 80) ? 60 : 30
	}
	get TURN_RATE() {
		return (this.frame > 80) ? 0.3 : 2.3
	}
	get ACCELERATION() {
		return (this.frame > 90) ? 10 : 100
	}
	get G_ALPHA() {
		return (this.frame > 80) ? 'f' : '7'
	}
	get G_PARAM_A() { return 0.1 }
	get G_PARAM_B() {
		return (this.frame > 90) ? 0.75 + 0.3*(this.frame - 90)/30 : 0.75
	}
}