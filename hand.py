import cv2
import mediapipe as mp
import numpy as np
cap = cv2.VideoCapture(0)
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
mp_draw = mp.solutions.drawing_utils
canvas = np.zeros((720, 1280, 3), dtype=np.uint8)
prev_x, prev_y = 0, 0
while True:
 ret, frame = cap.read()
 if not ret:
 break
 frame = cv2.flip(frame, 1)
 frame = cv2.resize(frame, (1280, 720))
 rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
 result = hands.process(rgb)
 if result.multi_hand_landmarks:
 for hand in result.multi_hand_landmarks:
 h, w, _ = frame.shape
 x = int(hand.landmark[8].x * w)
 y = int(hand.landmark[8].y * h)
 if prev_x == 0 and prev_y == 0:
 prev_x, prev_y = x, y
 cv2.line(canvas, (prev_x, prev_y), (x, y), (0, 0, 255), 10)
 prev_x, prev_y = x, y
 else:
 prev_x, prev_y = 0, 0
 output = cv2.addWeighted(frame, 0.7, canvas, 1.0, 0)
 cv2.imshow("AI Finger Drawing", output)
 if cv2.waitKey(1) & 0xFF == ord('q'):
 break
cap.release()
cv2.destroyAllWindows()
