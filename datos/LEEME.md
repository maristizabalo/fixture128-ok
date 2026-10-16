# Carpeta `datos/` — el Excel del fixture

Deja aquí el Excel con los 128 jugadores, idealmente con el nombre `fixture.xlsx`
(también sirve `.xls` o `.csv`). Al desplegar, el cuadro público sale de este
archivo mientras no se haya publicado otra lista desde el panel (`/admin`).

Formatos que se reconocen solos:

**Lista** — una fila por jugador, en el orden de las llaves (1 contra 2, 3 contra 4…):

| Llave | Jugador          | Categoría | Club    |
| ----- | ---------------- | --------- | ------- |
| 1     | Juan Pérez Gómez | 3ra       | Club OK |
| 2     | Carlos Díaz      | 2da       | Club 8  |

**Parejas** — una fila por partida de la primera ronda:

| Partida | Jugador 1        | Categoría | Jugador 2   | Categoría |
| ------- | ---------------- | --------- | ----------- | --------- |
| 1       | Juan Pérez Gómez | 3ra       | Carlos Díaz | 2da       |

Un cupo vacío o escrito `BYE` / `LIBRE` queda libre y su rival pasa directo.

En cuanto se carga el primer resultado, la lista queda fijada en la base de
datos: cambiar este archivo después ya no mueve a nadie de llave. Para cambiarla
con el torneo en marcha se usa el panel (pestaña *Jugadores*).
