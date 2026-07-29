extends Control

var ship1 = preload("res://Scenes/ship_1.tscn");
var ship2 = preload("res://Scenes/ship_2.tscn");
var ship3 = preload("res://Scenes/ship_3.tscn");
var ship4 = preload("res://Scenes/ship_4.tscn");
var ships = [ship1,ship2,ship3,ship4]
var index = 0;
var numShips = 4;
var shipPosition = Vector2 (0,0);
var currentShip;

func _ready() -> void:
	newShip();

func newShip() -> void:
	if currentShip != null:
			currentShip.queue_free();
	currentShip = ships[index].instantiate()
	currentShip.global_position = shipPosition;
	if currentShip is Control:
		currentShip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(currentShip);

func _on_left_button_button_down() -> void:
	index = (index - 1 + numShips) % numShips
	newShip()

func _on_right_button_button_down() -> void:
	index = (index + 1) % numShips
	newShip()
