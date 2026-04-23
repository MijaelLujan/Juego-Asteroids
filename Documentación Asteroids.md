
# Documentación: Juego Asteroids

## 1. Uso de Set para el manejo de los Input
Se utilizó dos listas Set para representar las teclas que van a estar presionadas durante el juego
A diferencia de otras estructuras como los arreglos, el Set no permite elementos duplicados, de este modo evitamos que una misma tecla se registre varias veces. Así cada tecla se añade una sola vez a la lista al presionarse y se elimina al soltarse, manteniendo un estado claro del input del usuario.

## 2. Dos listas diferentes para distintas acciones
Dentro del juego existen dos tipos de acciones.
Las primeras son las de movimiento, estas son continuas.
Las segundas son de disparo, a la cual se le asignó un cooldown (se dispara 5 veces cada segundo)
Por esta razón, se utilizan dos Set diferentes. Esto permite dividir correctamente las acciones que tenemos.

Algo que se vió al momento de jugar, fue un error al salir al cambiar de ventana, pues los eventos no se registraban correctamente y esto producía que la nave se mueva indefinidamente o dispare sin parar

## 3. Evento Blur para el manejo de errores
Se identificó una forma de provocar un bug al momento de jugar: cuando el jugador mantiene presionada una tecla y cambia de ventana. En ese momento, el juego tiene aún registrados eventos anteriores en los set.
Entendiendo el problema, la solución dada fue agregar un nuevo evento. Se agregó Blur, el cual es un evento que ocurre cuando un elemento pierde el foco, de este modo se detecta cuándo el usuario sale del juego. Cuando ocurre el evento, vaciamos ambos set, solucionando así el error.
