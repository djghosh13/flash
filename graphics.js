function setupGraphics() {
	Screen = document.getElementById("game")
	Graphics = Screen.getContext("2d")
	PlayerID = 0
	// Get screen dimensions
	$(window).resize(function() {
		if (0.6429*this.innerWidth > this.innerHeight) {
			Screen.height = 0.9*this.innerHeight
			Screen.width = Screen.height/0.6429
		} else {
			Screen.width = 0.9*this.innerWidth
			Screen.height = Screen.width*0.6429
		}
		Graphics.SCALE = Screen.width / 160
	})
	$(window).resize()
}

function drawArena() {
	let G = Graphics
	// Background
	G.fillStyle = "#000"
	G.shadowBlur = 0
	G.fillRect(0,0,Screen.width,Screen.height)
	// Arena
	G.fillStyle = "#000"
	G.shadowColor = "#999f99"
	G.shadowBlur = 10*G.SCALE
	G.fillRect(4.5*G.SCALE,4.5*G.SCALE,150*G.SCALE,80*G.SCALE)
	// Info
	G.font = "10px monospace"
	G.textAlign = "center"
	G.textBaseline = "top"
	G.fillStyle = "#ccf9"
	G.shadowColor = "#fcf"
	G.shadowBlur = 100
	G.scale(G.SCALE,G.SCALE)
	G.fillText(Mechanics.disks[PlayerID].mode,75,84.5)
	G.resetTransform()
}

function drawDisk(disk) {
	const teamColor = ["#88f","#f88","#666"]
	let G = Graphics
	let center = V(4.5,4.5).add(disk.position).mul(G.SCALE)
	let radius = Disk.radius * G.SCALE
	// Transform
	G.translate(center.x,center.y)
	G.scale(radius,radius)
	G.rotate(disk.direction)
	// Draw direction
	if (disk.team !== 2) {
		G.beginPath()
		G.fillStyle = teamColor[disk.team] + disk.state.G_ALPHA
		G.shadowColor = teamColor[disk.team]
		G.shadowBlur = radius
		G.arc(-0.1,0,1.2,-0.7,0.7)
		G.lineTo(0.81781 + disk.state.G_PARAM_A,0.77306)
		G.lineTo(0.81781 + disk.state.G_PARAM_A + disk.state.G_PARAM_B,0)
		G.lineTo(0.81781 + disk.state.G_PARAM_A,-0.77306)
		G.fill()
		G.closePath()
	}
	// Draw disk
	G.beginPath()
	G.fillStyle = teamColor[disk.team] + disk.state.G_ALPHA
	G.shadowColor = teamColor[disk.team]
	G.shadowBlur = radius
	G.ellipse(0,0,1,1,0,0,2*Math.PI)
	G.fill()
	G.closePath()
	// Reset transform
	G.resetTransform()
}

function drawPowerup(powerup) {
	const teamColor = ["#99f","#f99"]
	const killColor = ["#96f","#f69"]
	let color = (powerup.mode === "KILL") ? killColor[powerup.team] : teamColor[powerup.team]
	let G = Graphics
	let center = V(4.5,4.5).add(powerup.position).mul(G.SCALE)
	let radius = Powerup.radius * G.SCALE
	// Transform
	G.translate(center.x,center.y)
	G.scale(radius,radius)
	// Draw disk
	G.beginPath()
	G.fillStyle = color + '9'
	G.shadowColor = color
	G.shadowBlur = 20
	G.arc(0,0,1,0,2*Math.PI)
	G.fill()
	G.closePath()
	// Reset transform
	G.resetTransform()
}

function setPlayer(id) {
	PlayerID = Math.floor(id)
}

function drawPlayer() {
	const teamColor = ["#88f","#f88","#666"]
	let G = Graphics
	let player = Mechanics.disks[PlayerID]
	let center = V(4.5,4.5).add(player.position).mul(G.SCALE)
	let radius = Disk.radius*G.SCALE
	// Transform
	G.translate(center.x,center.y)
	G.scale(radius,radius)
	G.rotate(player.direction)
	// Draw disk outline
	G.beginPath()
	G.strokeStyle = teamColor[player.team]
	G.lineWidth = 0.05
	G.shadowColor = "#0000"
	G.shadowBlur = 0
	G.arc(0,0,1.1,0,2*Math.PI)
	G.closePath()
	G.stroke()
	// Reset transform
	G.resetTransform()
}

function drawSpecial() {
	let G = Graphics
	if (Mechanics.specFrames === 0) {
		setSpecial("NONE")
		return
	}
	if (Mechanics.special !== "NONE") {
		Mechanics.specFrames--
		G.font = "40px monospace"
		G.textAlign = "center"
		G.textBaseline = "middle"
		G.fillStyle = "#fcf9"
		G.shadowColor = "#fcf"
		G.shadowBlur = 100
		G.scale(G.SCALE,G.SCALE)
		G.fillText(Mechanics.special,75,40)
		G.resetTransform()
	}
}

function specialFill(color) {
	let G = Graphics
	G.scale(G.SCALE,G.SCALE)
	G.fillStyle = color
	G.shadowColor = "transparent"
	G.fillRect(4.5,4.5,150,80)
	G.resetTransform()
}
function specialCircle(center,color,radius) {
	let G = Graphics
	G.scale(G.SCALE,G.SCALE)
	G.fillStyle = color + "6"
	G.shadowColor = color
	G.shadowBlur = 100
	G.arc(4.5 + center.x,4.5 + center.y,radius,0,2*Math.PI)
	G.fill()
	G.resetTransform()
}