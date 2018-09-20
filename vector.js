class Vector {
	constructor(x,y) {
		this.x = x
		this.y = y
	}
	add(vec) {
		return new Vector(this.x + vec.x,this.y + vec.y)
	}
	sub(vec) {
		return new Vector(this.x - vec.x,this.y - vec.y)
	}
	mul(num) {
		return new Vector(this.x*num,this.y*num)
	}
	div(num) {
		return new Vector(this.x*num,this.y*num)
	}
	len() {
		return Math.sqrt(this.x*this.x + this.y*this.y)
	}
	len2() {
		return this.x*this.x + this.y*this.y
	}
	norm(num=1) {
		let len = Math.sqrt(this.x*this.x + this.y*this.y)
		if (len === 0) return new Vector(0,0)
		else return new Vector(num*this.x/len,num*this.y/len)
	}
	angle() {
		return Math.atan2(this.y,this.x)
	}
	dot(vec) {
		return this.x*vec.x + this.y*vec.y
	}
}

function V(x=0,y=0) {
	return new Vector(x,y)
}

function A(n) {
	n = n % (2*Math.PI)
	if (n > Math.PI)
		return n - 2*Math.PI
	if (n < -Math.PI)
		return n + 2*Math.PI
	else
		return n
}

// Utility functions
function constrain(value,min,max) {
	if (value < min) return min
	if (value > max) return max
	return value
}