# Manual Admin V1

Este manual explica como usar la app desde el rol administrador. No es solo una lista de botones: incluye que es cada parte, para que sirve, por que se usa asi y que conviene evitar.

## Criterio general

La app tiene dos ideas centrales:

- El jugador debe poder resolver rapido su parte: ver deuda, pagar, informar pago y responder entrenamientos.
- El admin debe validar y corregir datos sensibles: pagos, cuotas, jugadores, codigos, asistencia y backups.

La regla de seguridad de esta MVP es simple: si algo impacta deuda, habilitacion, cuota o datos compartidos, lo hace el admin.

Al 2026-05-31 la app queda cerrada para uso controlado. El objetivo del admin no es sumar mas funciones, sino operar con jugadores reales y anotar fricciones concretas: textos que confunden, botones dificiles, datos que no cierran o tareas que se repiten demasiado.

## Entrar en modo admin

**Que es**

El modo admin muestra las herramientas internas de gestion.

En la pantalla admin, las herramientas estan ordenadas por pestanas: `Resumen`, `Jugadores`, `Cuotas`, `Pagos`, `Entrenamientos`, `Votaciones beta`, `Estadisticas`, `Convocatorias`, `Reportes`, `VIP`, `Configuracion` y `Backups`.

Cuando una pestana tiene varias herramientas, aparece una segunda fila de botones internos. Eso permite ver una sola tarjeta por vez y evita que el admin quede como una sabana larga.

**Para que sirve**

Sirve para separar la vista comun del jugador de la administracion del equipo.

**Por que se usa asi**

Todavia no hay login real. El PIN no reemplaza una autenticacion completa, pero baja el riesgo de que alguien toque acciones sensibles por accidente.

**Como se usa**

1. Abrir la app.
2. Tocar `Modo admin`.
3. Ingresar el PIN.
4. Tocar `Entrar`.
5. Para salir, tocar `Salir modo admin`.

**Que no hacer**

No compartir el PIN en grupos generales. No dejar la app abierta en modo admin en un celular ajeno.

## Jugadores y codigos

**Que es**

Es el modulo donde se cargan y revisan los jugadores del equipo.

**Para que sirve**

Sirve para que cada jugador tenga tipo, estado, codigo de acceso, habilitacion interna y datos basicos.

**Por que se usa asi**

La cuota se calcula sobre los jugadores cargados y su tipo. Si faltan jugadores reales, la cuota puede quedar mal repartida.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Nuevo jugador` para cargar uno por uno, o `Carga masiva jugadores` para pegar desde planilla.
3. Revisar tipo:
   - `Competidor`: entrena y ademas se le suma domingo.
   - `Solo entrenamientos`: solo participa del costo de martes y jueves.
4. Revisar estado:
   - `Activo`: cuenta para cuota y entrenamientos.
   - `Lesionado`, `Lista de espera`, `Esporadico` o `Baja`: no deberian contar como cuota mensual normal.
5. Asignar codigo de acceso.
6. Revisar `Habilitado interno`.
7. Para cambiar un jugador ya cargado, usar la tabla de jugadores: la columna `Estado` tiene un selector editable.

**Que no hacer**

No cargar duplicados con nombres escritos distinto. No dejar jugadores reales sin codigo si van a probar desde su celular. No cambiar estado o tipo sin entender que puede afectar el calculo de cuota.

**Ejemplo**

Si un jugador compite los domingos y esta activo, debe quedar como `Competidor` y `Activo`. Si solo viene a entrenar y paga entrenamientos, debe quedar como `Solo entrenamientos` y `Activo`.

## Cuotas

**Que es**

Es el modulo donde se carga el mes a cobrar.

**Para que sirve**

Sirve para calcular cuanto corresponde cobrar por jugador en un mes.

**Por que se usa asi**

El costo mensual se reparte segun la cantidad de jugadores que pagan y segun el tipo de jugador. Competidores participan de entrenamientos y domingos; solo entrenamientos participan solo de martes y jueves.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Cargar cuota`.
3. Elegir mes.
4. Cargar costo de turno de entrenamiento.
5. Cargar costo de domingo.
6. Definir base de cobro si no se quiere usar automaticamente la cantidad total de jugadores.
7. Definir interes desde dia 11.
8. Guardar.

Para pagos anticipados del mes siguiente, usar `Crear cuota del mes siguiente`. La app copia los valores actuales de la ultima cuota, crea el nuevo mes y permite registrar pagos contra esa cuota. No copia montos fijos historicos.

Cuando se crea la cuota siguiente, los formularios de pago quedan apuntando a ese nuevo mes. Los selectores muestran `mes anterior`, `mes actual` o `cuota futura` para que sea mas dificil registrar un pago en el periodo equivocado.

**Que no hacer**

No cargar dos cuotas para el mismo mes. Si el mes ya existe, editar la base en la lista de cuotas. No tocar abril 2026 sin recordar que tiene monto historico fijo.

**Ejemplo**

Si el equipo decide repartir el mes entre 15 jugadores aunque haya mas cargados, se usa `Base cobro entrenamientos` y `Base cobro domingos` con 15.

## Vista jugador: Mi cuota

**Que es**

Es la pantalla que ve el jugador para saber que debe y como informar pagos.

**Para que sirve**

Sirve para que el jugador no dependa de preguntar por WhatsApp cuanto debe.

**Por que se usa asi**

La experiencia del jugador tiene que ser corta: elegir nombre, ingresar codigo, mirar monto, pagar e informar.

La app instalada recuerda el acceso del jugador en ese celular. Si minimiza o vuelve a abrir la app, no deberia pedirle el codigo otra vez. El modo admin no queda guardado.

**Como se usa desde admin para probar**

1. Seleccionar un jugador.
2. Ingresar su codigo o entrar en modo admin.
3. Revisar mes.
4. Verificar monto, vencimiento, deuda atrasada y proxima cuota.

**Que no hacer**

No probar pagos reales si todavia estan revisando datos. No informar pagos duplicados para el mismo mes salvo que se quiera corregir con admin.

## Pagos informados por jugadores

**Que es**

Es el registro que carga el jugador cuando dice que pago.

**Para que sirve**

Sirve para que Tesoreria tenga una lista de pagos a validar.

**Por que se usa asi**

Un jugador puede equivocarse de monto, mes, fecha o metodo. Por eso el pago queda `pendiente` hasta que el admin lo aprueba.

**Como se usa**

1. El jugador entra con su codigo.
2. Elige el mes correcto.
3. Si paga por alias, transfiere fuera de la app.
4. Vuelve a la app.
5. Completa metodo, monto, fecha y observacion o numero de operacion.
6. Toca `Informar pago`.
7. La pantalla muestra una tarjeta indicando si el pago quedo pendiente, aprobado o rechazado.

**Que no hacer**

No aprobar pagos sin revisar. No asumir que pago pendiente descuenta deuda. No pedir que carguen dos veces el mismo mes si ya hay pago informado.

**Ejemplo**

Un jugador informa `60000` para mayo. Hasta que se aprueba, su deuda sigue visible como pendiente.

## Validacion de pagos

**Que es**

Es el modulo admin donde se aprueban o rechazan pagos pendientes.

**Para que sirve**

Sirve para que solo los pagos verificados impacten en deuda y estado.

**Por que se usa asi**

La deuda y la habilitacion dependen de pagos reales. Aprobar sin revisar puede dejar al dia a alguien que no pago, o cargar un mes incorrecto.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Validacion de pagos`.
3. Revisar jugador, cuota, monto, fecha, metodo y observacion.
4. Comparar contra Mercado Pago, banco o efectivo recibido.
5. Tocar `Aprobar` si coincide.
6. Tocar `Rechazar` si no coincide.

**Que no hacer**

No rechazar pagos reales por error. No eliminar pagos reales salvo que haya una correccion clara. Si hay duda, dejar pendiente y hablar con el jugador.

**Ejemplo**

Si un jugador pago abril antes del 10 pero cargo fecha posterior, puede aparecer interes. En ese caso conviene corregir/eliminar y cargar bien el pago antes de aprobar.

## Cargar pago admin

**Que es**

Es una carga directa de Tesoreria.

**Para que sirve**

Sirve para registrar pagos que ya fueron verificados por el admin, por ejemplo efectivo recibido en mano.

**Por que se usa asi**

Como es una accion hecha por admin, la app registra el pago y lo aprueba en el mismo flujo. Si ya habia pagos para esa cuota, la app pregunta si queres reemplazarlos.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Cargar pago admin`.
3. Elegir jugador.
4. Elegir cuota.
5. Cargar monto y fecha.
6. Agregar nota si hace falta.
7. Guardar.

**Que no hacer**

No usar esta carga para pagos que todavia no fueron verificados. Para pagos dudosos, usar el flujo pendiente.

## Historial de pagos

**Que es**

Es la lista de pagos informados, aprobados y rechazados.

**Para que sirve**

Sirve para auditar que paso con cada pago.

**Por que se usa asi**

Cuando hay pruebas, errores de mes o pagos parciales, el historial permite entender por que una deuda quedo como quedo.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Historial de pagos`.
3. Revisar estado y fecha.
4. Usar `Eliminar` solo para pagos de prueba o correcciones claras.

**Que no hacer**

No borrar pagos reales para "limpiar visualmente". Si el pago existio, conviene conservarlo o rechazarlo segun corresponda.

## Tesoreria

**Que es**

Es la configuracion de cobro.

**Para que sirve**

Define alias, titular, instrucciones, link de pago y modo prueba.

**Por que se usa asi**

La pantalla del jugador toma estas instrucciones. Si el texto es claro, baja la cantidad de preguntas por WhatsApp.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Tesoreria`.
3. Revisar alias, titular e instrucciones.
4. Si hay link real, cargarlo.
5. Si todavia no se quieren pagos reales, activar modo prueba.
6. Guardar.

**Que no hacer**

No dejar instrucciones ambiguas. No activar pago real sin probar antes que los montos y meses esten correctos.

## Entrenamientos: listado temporal

**Que es**

Es la pestaña donde el jugador responde si va al entrenamiento.

**Para que sirve**

Sirve para saber cuantos van a entrenar y si hace falta invitar gente.

**Por que se usa asi**

El listado se abre antes del entrenamiento y se cierra al publico a las `20:30` del mismo dia. Aunque desaparezca para jugadores, queda guardado para historial y estadisticas.

Desde el cierre, todos los martes y jueves configurados cuentan para estadisticas. Si una fecha no tiene ninguna respuesta cargada, la app interpreta que todos los jugadores activos estuvieron ausentes. No crea registros falsos, pero si lo usa para estadisticas y responsabilidad.

**Como se usa**

1. El jugador entra con su codigo.
2. Va a la pestana `Entrenamientos`.
3. Elige una opcion:
   - `Voy`
   - `Solo cena`
   - `No voy`
   - `Avisa mas tarde`
   - `Llega sobre la hora`
   - `Baja sobre la hora`, cuando corresponde.
4. Despues de responder puede sumar emoticones opcionales como cena, cocinero, vino, pan, bebida o esponja/lavado. Cada emoticon se puede usar una sola vez por jugador.
5. La lista publica muestra quienes confirmaron, la lista secundaria de cena y quienes todavia no respondieron.

En celular, cada bloque muestra contador: `Listado`, `Cena` y `No me interesa`. La lista de `No me interesa` puede desplazarse dentro del bloque para que no tape toda la pantalla.

**Invitados**

En modo admin, dentro del listado temporal abierto, se puede escribir el nombre de un invitado y tocar `Agregar invitado`. La app lo muestra como `Nombre (invitado)` en la lista de ese entrenamiento.

El invitado no se crea como jugador, no tiene codigo, no genera cuota, no entra en deuda, no entra en morosos y no modifica responsabilidad. Sirve solo para completar la lista temporal del dia.

Si el invitado se baja, el admin puede tocar `Quitar` en el listado temporal o `Quitar invitado` en la tabla de entrenamientos. Eso borra solo la asistencia del invitado, sin tocar jugadores reales.

**Que no hacer**

No usar el listado como deuda ni habilitacion. No cerrar manualmente registros si todavia se esta probando el flujo.

**Dato historico inicial**

La app ya tiene cargado un bloque historico inicial desde la planilla de abril/mayo 2026. Ese bloque sirve como arranque de estadisticas de asistencia y responsabilidad.

Si falta una fecha historica y esa fecha fue martes o jueves posterior al inicio de asistencia, la app la va a contar como jornada cerrada sin respuestas. Eso aumenta las ausencias inferidas.

## Correccion de asistencia

**Que es**

Es una herramienta admin para corregir o completar registros puntuales.

**Para que sirve**

Sirve si un jugador no pudo cargar, cargo mal, o si el admin necesita ajustar el presentismo.

**Por que se usa asi**

La carga principal debe hacerla cada jugador. La correccion admin existe para casos excepcionales, no para reemplazar la participacion del jugador.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Correccion de asistencia`.
3. Elegir fecha.
4. Elegir jugador.
5. Guardar correccion.

**Que no hacer**

No cargar toda la asistencia manualmente si el objetivo es que cada jugador responda desde la app. No usar correccion para castigar o modificar puntos sin una regla clara.

## Respuesta admin

**Que es**

Es el modulo para anotar o corregir la respuesta de un jugador cuando no pudo usar la app.

**Para que sirve**

Sirve para cargar `Voy`, `No voy`, `Avisa mas tarde`, `Llega sobre la hora`, `Falto`, `Aviso tarde` o `Baja sobre la hora` desde modo admin.

**Por que se usa asi**

La carga principal debe hacerla cada jugador, pero el admin necesita una salida practica cuando alguien avisa por WhatsApp o no puede entrar.

**Como se usa**

1. Entrar en modo admin.
2. Elegir fecha.
3. Elegir jugador.
4. Elegir estado.
5. Guardar.

**Que no hacer**

No mezclar esta carga con cocina/lavado. No usarla para reemplazar siempre la respuesta del jugador si la app ya esta funcionando.

## Votaciones beta

**Que es**

Es una prueba para simular una futura votacion despues de cada entrenamiento: un destacado con premio y un voto de esponja.

**Para que sirve**

Sirve para validar con jugadores si la app detecta bien a los participantes reales y si la pantalla se entiende antes de guardar votos reales.

**Por que se usa asi**

La votacion puede cambiar habitos del equipo. Por ahora se muestra como beta para jugadores y admin, con datos reales, sin bloquear pantallas ni guardar votos.

**Como se usa**

1. Como jugador, entrar con codigo y abrir `Votacion beta`.
2. Elegir fecha de entrenamiento.
3. Elegir el destacado.
4. Elegir si el premio del destacado es `Pelota` o `Copa`.
5. Elegir el jugador para `Esponja`.
6. Como admin, tambien se puede revisar la simulacion desde `Votaciones beta`.

**Que no hace todavia**

No guarda votos reales, no modifica responsabilidad, no cambia estadisticas y no define premios oficiales.

## Reporte WhatsApp

**Que es**

Es un texto preparado para copiar y pegar.

**Para que sirve**

Sirve para comunicar citados o informacion administrativa sin escribir todo a mano.

**Por que se usa asi**

El ranking puede sugerir, pero la decision final de convocatoria debe poder revisarla una persona.

**Como se usa**

1. Entrar en modo admin.
2. Revisar jugadores, deudas y habilitaciones.
3. Ir a `Reporte WhatsApp`.
4. Copiar el texto.
5. Revisarlo antes de enviarlo.

**Que no hacer**

No mandar el reporte sin revisar si hubo cambios recientes de pago, deuda o habilitacion.

## Informes

**Que es**

Es la seccion para leer datos existentes de pagos, asistencia y responsabilidad en formato mas claro.

**Para que sirve**

Sirve para revisar un jugador puntual, mirar todos los pagos, controlar asistencia, revisar responsabilidad o tener un resumen general del equipo sin tocar datos.

**Por que se usa asi**

Los informes no modifican nada. Solo leen lo que ya esta cargado en jugadores, cuotas, pagos y asistencias. Si algun dato falta, el informe muestra ceros o `sin datos` en vez de romper la app.

**Como se usa**

1. Entrar en modo admin.
2. Ir a `Reportes`.
3. Elegir tipo de informe:
   - `Individual`
   - `Pagos general`
   - `Asistencia general`
   - `Responsabilidad general`
   - `General del equipo`
   - `Graficos`
4. Elegir jugador si el informe es individual.
5. Elegir mes o `Todos los meses`.
6. Tocar `Generar informe`.
7. Revisar el resultado en pantalla o tocar `Copiar informe`.

**Que mirar**

En pagos, revisar deuda, interes y pagos pendientes. En asistencia, revisar no respuestas y bajas sobre la hora. En responsabilidad, revisar descuentos y motivo principal.

**Que no hacer**

No usar el informe como comprobante definitivo sin revisar pagos pendientes. No confundir `pagos pendientes` con dinero aprobado: solo los pagos aprobados descuentan deuda.

## Backups

**Que es**

Es la exportacion/importacion de datos en JSON.

**Para que sirve**

Sirve para tener puntos de restauracion antes de pruebas, limpiezas o cambios grandes.

**Por que se usa asi**

Supabase guarda los datos compartidos, pero el backup permite volver a un estado conocido si algo queda mal durante pruebas.

**Como se usa**

1. Antes de cambios importantes, tocar `Exportar backup JSON`.
2. Guardar el archivo con nombre claro.
3. Si hace falta restaurar, usar `Importar backup JSON`.
4. Confirmar solo si estas seguro.

**Que no hacer**

No importar backups viejos sin saber que contienen. No restablecer datos de prueba si ya estas trabajando con jugadores reales.

## Rutina recomendada

**Inicio de mes**

1. Revisar jugadores activos y tipos.
2. Cargar o revisar cuota del mes.
3. Revisar bases de cobro.
4. Revisar alias/instrucciones.
5. Exportar backup.

**Durante el mes**

1. Revisar pagos pendientes.
2. Aprobar solo pagos verificados.
3. Rechazar o corregir errores.
4. Revisar morosos despues del dia 11.

**Dia de entrenamiento**

1. Revisar pestaña de entrenamientos.
2. Ver cuantos confirmaron.
3. Mirar quienes todavia no respondieron.
4. Corregir solo casos puntuales si hace falta.

**Antes de una prueba real**

1. Exportar backup.
2. Revisar que los jugadores tengan codigo.
3. Probar con 1 jugador propio.
4. Recien despues mandar el mensaje al grupo.

## Errores frecuentes

**El jugador no ve sus datos**

Revisar que tenga codigo asignado y que lo este ingresando bien.

**No aparece entrenamiento**

Puede no haber listado abierto, el jugador puede no estar activo, o la app instalada puede estar esperando actualizar.

**La deuda no baja**

Revisar si el pago esta `aprobado`. Los pagos pendientes o rechazados no descuentan.

**Aparece interes**

Revisar fecha de pago y fecha de vencimiento. Si pago antes del 10 pero cargo fecha posterior, puede calcular interes.

**Hay un pago duplicado**

Desde admin, revisar historial y eliminar solo si es prueba o error claro.

## Cosas que todavia no son definitivas

- No hay login real con Supabase Auth.
- El PIN admin es una seguridad MVP, no definitiva.
- No hay Mercado Pago API ni confirmacion automatica.
- No hay cierre formal de jornada.
- No hay ranking calculado completo desde todos los eventos.
- No hay modulo VIP final.

## Regla final

Si una accion modifica dinero, deuda, habilitacion, asistencia historica o datos compartidos, conviene hacer backup antes y revisar dos veces. La app ya ayuda bastante, pero la MVP todavia necesita criterio humano.
