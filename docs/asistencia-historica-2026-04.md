# Asistencia historica inicial

Carga inicial tomada de la planilla historica visible del mes en que empezo el torneo.

Fecha de carga en Supabase: 2026-05-09.

Fuente: planilla historica de entrenamientos compartida por imagen.

Regla aplicada:

- Cada nombre simple se cargo como `asistio`.
- Cada texto `se bajo sobre la hora` se cargo como `baja_sobre_la_hora`.
- `baja_sobre_la_hora` descuenta responsabilidad.
- Los nombres se mapearon contra los jugadores reales de Supabase, respetando tildes en la base.

## Resumen

- Registros totales: 113.
- Asistencias: 110.
- Bajas sobre la hora: 3.
- Entrenamientos cargados: 11.

## Detalle por fecha

```txt
2026-04-02 asistio:
Smart, Besada, Ciancio, Smith, Kafka, Banzato, Acuna

2026-04-07 asistio:
Segobia, Smart, Gutierrez, Franceschini, Banzato, Kafka, Smith, Besada, Acuna, Ciancio, Martinez

2026-04-09 asistio:
Segobia, Smart, Arevalo, Kafka, Besada, Gutierrez, Beltran, Franceschini, Smith, Acuna

2026-04-14 asistio:
Franceschini, Smart, Polo, Arevalo, Martinez, Kafka, Banzato, Ciancio, Besada, Acuna

2026-04-16 asistio:
Segobia, Franceschini, Martino, Kafka, Gutierrez, Smart, Besada, Bustamante, Acuna, Soibelson, Martinez, Banzato, Beltran, Polo

2026-04-21 asistio:
Gutierrez, Smart, Beltran, Franceschini, Smith, Arevalo, Acuna, Banzato

2026-04-23 asistio:
Gutierrez, Smart, Franceschini, Martino, Arevalo, Kafka, Besada, Acuna

2026-04-28 asistio:
Segobia, Franceschini, Besada, Kafka, Smart, Arevalo, Smith, Polo, Yelpo, Garcia, Caputo

2026-04-30 asistio:
Besada, Smart, Segobia, Soibelson, Kafka, Gutierrez, Acuna, Smith, Arevalo

2026-05-05 asistio:
Polo, Besada, Franceschini, Smart, Caputo, Martinez, Kafka, Bustamante, Arevalo, Soibelson, Smith

2026-05-05 baja_sobre_la_hora:
Beltran, Segobia

2026-05-07 asistio:
Segobia, Smart, Franceschini, Martinez, Gutierrez, Bustamante, Besada, Arevalo, Smith, Kafka, Beltran

2026-05-07 baja_sobre_la_hora:
Ciancio
```

## Conteos verificados en Supabase

```txt
2026-04-02 asistio: 7
2026-04-07 asistio: 11
2026-04-09 asistio: 10
2026-04-14 asistio: 10
2026-04-16 asistio: 14
2026-04-21 asistio: 8
2026-04-23 asistio: 8
2026-04-28 asistio: 11
2026-04-30 asistio: 9
2026-05-05 asistio: 11
2026-05-05 baja_sobre_la_hora: 2
2026-05-07 asistio: 11
2026-05-07 baja_sobre_la_hora: 1
```

## Mapeo de nombres

```txt
Acuna -> Nahuel Acuna
Arevalo -> Atahualpa Arevalo
Banzato -> Federico Banzato
Beltran -> Luciano Beltran
Besada -> Manuel Esteban Besada
Bustamante -> Gaston Ariel Bustamante
Caputo -> Leandro Nicolas Caputo
Ciancio -> Martin Ciancio
Franceschini -> Einar Franceschini
Garcia -> Garcia Geronimo
Gutierrez -> Sebastian Gutierrez
Kafka -> Patricio Kafka
Martinez -> David Martinez
Martino -> Lisandro Martino
Polo -> Mario Facundo Polo
Segobia -> Sebastian Segobia
Smart -> Daniel Leslie Smart
Smith -> Mariano Agustin Smith
Soibelson -> Esteban Soibelzon
Yelpo -> Yelpo Pablo
```
