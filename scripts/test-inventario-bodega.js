#!/usr/bin/env node
/*
  Script de prueba para Inventario Bodega (Firestore admin).
  Requisitos:
    npm install firebase-admin
  Credenciales:
    - Usar GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON, o
    - Definir FIREBASE_SERVICE_ACCOUNT_JSON con el JSON en la variable de entorno.

  Ejecución:
    node scripts/test-inventario-bodega.js
*/

const path = require('path')

async function main() {
  let admin
  try {
    admin = require('firebase-admin')
  } catch (err) {
    console.error('Instala firebase-admin: npm install firebase-admin')
    process.exit(1)
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      admin.initializeApp({ credential: admin.credential.cert(key) })
    } catch (err) {
      console.error('Fallo al parsear FIREBASE_SERVICE_ACCOUNT_JSON:', err.message)
      process.exit(1)
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      const fullPath = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath)
      const key = require(fullPath)
      admin.initializeApp({ credential: admin.credential.cert(key) })
    } catch (err) {
      console.error('Fallo al leer GOOGLE_APPLICATION_CREDENTIALS:', err.message)
      process.exit(1)
    }
  } else {
    console.error('Provee credenciales: GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON')
    process.exit(1)
  }

  const db = admin.firestore()

  try {
    const barcode = `TEST-${Date.now().toString(36).toUpperCase()}`
    const item = {
      barcode,
      descripcion: 'Salpicadera Versa 2023 (PRUEBA)',
      categoria: 'Carroceria',
      cantidad: 10,
      ubicacion: 'Rack TST-1',
      costoUnitario: 1500,
      proveedor: 'Refaccionaria XYZ (PRUEBA)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const itemRef = db.collection('inventario_bodega').doc(barcode)
    await itemRef.set(item)
    console.log('Item creado:', barcode)

    // Entrada +5
    const entradaQty = 5
    await db.runTransaction(async (t) => {
      const snap = await t.get(itemRef)
      if (!snap.exists) throw new Error('Item no existe')
      const current = Number(snap.data().cantidad || 0)
      t.update(itemRef, { cantidad: current + entradaQty, updatedAt: new Date().toISOString() })
      const movRef = db.collection('movimientos_bodega').doc()
      t.set(movRef, {
        inventarioId: barcode,
        tipo: 'entrada',
        cantidad: entradaQty,
        saldoPrevio: current,
        saldoPosterior: current + entradaQty,
        usuario: 'script-test',
        fecha: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })
    })

    const afterEntrada = (await itemRef.get()).data()
    console.log('Después de entrada, cantidad:', afterEntrada.cantidad)

    // Salida -3
    const salidaQty = 3
    await db.runTransaction(async (t) => {
      const snap = await t.get(itemRef)
      if (!snap.exists) throw new Error('Item no existe')
      const current = Number(snap.data().cantidad || 0)
      if (current < salidaQty) throw new Error('Stock insuficiente')
      t.update(itemRef, { cantidad: current - salidaQty, updatedAt: new Date().toISOString() })
      const movRef = db.collection('movimientos_bodega').doc()
      t.set(movRef, {
        inventarioId: barcode,
        tipo: 'salida',
        cantidad: salidaQty,
        saldoPrevio: current,
        saldoPosterior: current - salidaQty,
        usuario: 'script-test',
        fecha: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })
    })

    const afterSalida = (await itemRef.get()).data()
    console.log('Después de salida, cantidad:', afterSalida.cantidad)

    console.log('Prueba completada.')
    process.exit(0)
  } catch (err) {
    console.error('Error en prueba:', err.message || err)
    process.exit(1)
  }
}

main()
