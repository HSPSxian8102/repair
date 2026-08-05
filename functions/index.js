const functions = require('firebase-functions')
const admin     = require('firebase-admin')
const nodemailer = require('nodemailer')

admin.initializeApp()

// ── Email helpers ──────────────────────────────────────────────────────────────

function createTransporter() {
  const { user, pass } = functions.config().email
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
}

async function getAdminEmails() {
  const snap = await admin.firestore().collection('admins').get()
  const users = await Promise.all(
    snap.docs.map(d => admin.auth().getUser(d.id).catch(() => null))
  )
  return users.filter(Boolean).map(u => u.email).filter(Boolean)
}

function appUrl() {
  try { return functions.config().app.url.replace(/\/$/, '') } catch { return '' }
}

function repairLink(repairId) {
  const base = appUrl()
  return base ? `<p style="margin-top:16px"><a href="${base}/repair/${repairId}" style="background:#2563eb;color:#fff;padding:8px 18px;border-radius:4px;text-decoration:none;font-size:14px">查看報修單</a></p>` : ''
}

function tableRow(label, value) {
  return `<tr><td style="padding:5px 0;color:#888;width:90px;vertical-align:top">${label}</td><td style="padding:5px 0;color:#333">${value || '—'}</td></tr>`
}

const FOOTER = '<p style="color:#bbb;font-size:11px;margin-top:24px">設備線上報修系統</p>'

// ── 1. New repair → notify all admins ─────────────────────────────────────────

exports.onRepairCreated = functions
  .region('asia-east1')
  .firestore.document('repairs/{repairId}')
  .onCreate(async (snap, context) => {
    const r = snap.data()
    const repairId = context.params.repairId
    const urgent = r.priority === 'urgent'

    try {
      const adminEmails = await getAdminEmails()
      if (!adminEmails.length) return null

      await createTransporter().sendMail({
        from:    `"設備報修系統" <${functions.config().email.user}>`,
        to:      adminEmails.join(', '),
        subject: `【新報修${urgent ? '（緊急）' : ''}】${r.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px">
            <h2 style="color:#2563eb;margin-top:0">新報修單通知</h2>
            <table style="width:100%;border-collapse:collapse">
              ${tableRow('標題', `<strong>${r.title}</strong>`)}
              ${tableRow('地點', [r.locationName || r.location, r.locationDetail].filter(Boolean).join(' — '))}
              ${tableRow('問題說明', r.description)}
              ${tableRow('提交者', `${r.submitterName}（${r.submitterEmail}）`)}
            </table>
            ${repairLink(repairId)}
            ${FOOTER}
          </div>`,
      })
    } catch (err) {
      console.error('onRepairCreated:', err)
    }
    return null
  })

// ── 2. Repair completed → notify submitter ────────────────────────────────────

exports.onRepairUpdated = functions
  .region('asia-east1')
  .firestore.document('repairs/{repairId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after  = change.after.data()
    const repairId = context.params.repairId

    if (before.status === after.status || after.status !== 'completed') return null
    if (!after.submitterEmail) return null

    try {
      await createTransporter().sendMail({
        from:    `"設備報修系統" <${functions.config().email.user}>`,
        to:      after.submitterEmail,
        subject: `【報修完成】${after.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px">
            <h2 style="color:#0d9488;margin-top:0">報修完成通知</h2>
            <p style="color:#555">您提交的報修單已完成處理，感謝您的耐心等候。</p>
            <table style="width:100%;border-collapse:collapse">
              ${tableRow('標題', `<strong>${after.title}</strong>`)}
              ${tableRow('地點', [after.locationName || after.location, after.locationDetail].filter(Boolean).join(' — '))}
              ${tableRow('完成人員', after.completedBy)}
              ${after.completionNote ? tableRow('完成說明', after.completionNote) : ''}
            </table>
            ${repairLink(repairId)}
            ${FOOTER}
          </div>`,
      })
    } catch (err) {
      console.error('onRepairUpdated:', err)
    }
    return null
  })

// ── 3. List admins (callable) ─────────────────────────────────────────────────

exports.listAdmins = functions
  .region('asia-east1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '請先登入')

    const callerDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get()
    if (!callerDoc.exists) throw new functions.https.HttpsError('permission-denied', '僅限管理員使用')

    const snap = await admin.firestore().collection('admins').get()
    const results = await Promise.all(
      snap.docs.map(async d => {
        try {
          const u = await admin.auth().getUser(d.id)
          return { uid: d.id, role: d.data().role, email: u.email, displayName: u.displayName || '' }
        } catch {
          return { uid: d.id, role: d.data().role, email: d.data().email || '(未知)', displayName: '' }
        }
      })
    )
    return results
  })

// ── 4. Set admin role by email (callable, superadmin only) ────────────────────

exports.setAdminRole = functions
  .region('asia-east1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '請先登入')

    const callerDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get()
    if (!callerDoc.exists || callerDoc.data().role !== 'superadmin') {
      throw new functions.https.HttpsError('permission-denied', '僅超級管理員可執行此操作')
    }

    const { email, role } = data
    if (!email) throw new functions.https.HttpsError('invalid-argument', '請提供 Email')

    let userRecord
    try {
      userRecord = await admin.auth().getUserByEmail(email)
    } catch {
      throw new functions.https.HttpsError('not-found', '找不到此 Email 的使用者，請確認對方已以學校帳號登入過系統。')
    }

    const ref = admin.firestore().collection('admins').doc(userRecord.uid)
    if (role === null || role === undefined) {
      await ref.delete()
    } else {
      await ref.set({
        role,
        email:       userRecord.email,
        displayName: userRecord.displayName || '',
        updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
    }

    return { success: true, uid: userRecord.uid }
  })

// ── 5. Scheduled auto-archive (every Sunday 00:00 Asia/Taipei) ────────────────

exports.scheduledAutoArchive = functions
  .region('asia-east1')
  .pubsub.schedule('every sunday 00:00')
  .timeZone('Asia/Taipei')
  .onRun(async () => {
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 1)

    const snap = await admin.firestore()
      .collection('repairs')
      .where('status',   '==', 'completed')
      .where('archived', '==', false)
      .get()

    const toArchive = snap.docs.filter(d => {
      const ts = d.data().completedAt
      return ts && ts.toDate() < cutoff
    })

    if (!toArchive.length) {
      console.log('scheduledAutoArchive: nothing to archive.')
      return null
    }

    const batch = admin.firestore().batch()
    toArchive.forEach(d => batch.update(d.ref, { archived: true }))
    await batch.commit()

    console.log(`scheduledAutoArchive: archived ${toArchive.length} repair(s).`)
    return null
  })
