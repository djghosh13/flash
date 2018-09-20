/*
 * Goal-Oriented Action Planning Bot
 * Created for FLASH
 * 
 * Goals:
 * Kill Opponent
 * Stun Opponent
 * Body Blocking?
 * 
 * Actions:
 * Use DASH
 * Use Special
 * Collect Powerup
 * Move to Location
 */

/*
 * Action DASH
 * 
 * Preconds: MoveState
 * 
 * Cost = d (constant)
 * Reward = New Proximity to goal entity
 * 
 */

 /*
  * Action Use Special
  * 
  * Preconds: MoveState or ChillState, Have Powerup
  * 
  * Cost = p (constant)
  * Reward = How much it helps a goal
  * 
  */

/*
 * Action Collect Powerup
 * 
 * Cost ~ Distance to powerup
 * 
 * Preconds:
 * No Powerup
 * Powerup on Board
 * 
 * Effect:
 * Have Powerup
 */

/*
 * Action MOVE_TO_LOCATION
 * 
 * Preconds: None
 * 
 * Cost = Distance to location
 * Reward = Based on location of powerups and disks
 * 
 */