extends TextureButton

const parentalControlsPopUp = preload("res://Scenes/ParentalControlPopUp.tscn");
const PopUpPosition = Vector2 (0,-500)
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_button_down() -> void:
	print("ParentalControlButtonPressed")
	var PopUp = parentalControlsPopUp.instantiate();
	PopUp.global_position = PopUpPosition;
	add_child(PopUp)
