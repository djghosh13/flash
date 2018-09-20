$(document).ready(function() {
	setupGraphics()
	setupMechanics()
	setPlayer(1)
	spawn(20,20,0,new AntiAI())
	spawn(130,20,1,new MKInput())
	spawn(20,60,0,new AntiAI())
	spawn(130,60,1,new CircleAI())
	/*spawn(20,40,0,new AntiAI())
	spawn(130,40,1,new AntiAI())*/
	requestAnimationFrame(gameLoop)
})

function gameLoop() {
	// G
	drawArena()
	foreachPower(drawPowerup)
	foreach(drawDisk)
	drawPlayer()
	// I
	foreach(control)
	// M
	foreach(update)
	foreachPower(x => x.update())
	foreach(resolveDiskCollision)
	foreach(resolveWallCollision)
	foreach(applyFriction)
	//
	drawSpecial()
	if (Mechanics.powers.length < Mechanics.disks.length && Math.random() < 1/60/1)
		spawnPowerup(Math.round(Math.random()))
	//
	requestAnimationFrame(gameLoop)
}