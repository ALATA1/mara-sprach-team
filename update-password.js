'use strict'

const { loadEnvConfig } = require('@next/env')
const { createClient } = require('@supabase/supabase-js')
const { stdin, stdout } = require('node:process')

const TARGETS = {
  staging: {
    label: 'ALATA1',
    ref: 'usyfvtyqnjuflhswrfpg',
    urlEnv: 'NEXT_PUBLIC_SUPABASE_URL',
    keyEnv: 'SUPABASE_SERVICE_ROLE_KEY',
  },
  production: {
    label: 'mara-sprach-team',
    ref: 'swiabocapgyzzknrmjkf',
    urlEnv: 'SUPABASE_PRODUCTION_URL',
    keyEnv: 'supabase_production_admin_key',
  },
}

const ACCOUNTS = [
  { email: 'ibrahima.alata@conserto.pro', label: 'Admin' },
  { email: 'ibrahima.alata@gmail.com', label: 'Enseignant' },
  { email: 'celidoura@gmail.com', label: 'Etudiant' },
]

loadEnvConfig(process.cwd())

function ask(question) {
  return new Promise((resolve) => {
    stdin.resume()
    stdout.write(question)
    stdin.once('data', (answer) => resolve(answer.toString().trim()))
  })
}

function askMasked(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Lance ce script dans un terminal interactif de VS Code.'))
      return
    }

    const wasRaw = stdin.isRaw
    let password = ''
    stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()

    const finish = (error) => {
      stdin.off('data', onData)
      stdin.setRawMode(wasRaw)
      stdout.write('\n')
      if (error) reject(error)
      else resolve(password)
    }

    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          finish(new Error('Saisie annulée.'))
          return
        }
        if (character === '\r' || character === '\n') {
          finish()
          return
        }
        if (character === '\u007f' || character === '\b') {
          if (password.length > 0) {
            password = password.slice(0, -1)
            stdout.write('\b \b')
          }
          continue
        }
        if (character >= ' ') {
          password += character
          stdout.write('*')
        }
      }
    }

    stdin.on('data', onData)
  })
}

async function main() {
  const isProduction = process.argv.includes('--production')
  const updateAll = process.argv.includes('--all')
  const target = isProduction ? TARGETS.production : TARGETS.staging
  const projectUrl = process.env[target.urlEnv]
  const adminKey = process.env[target.keyEnv] ?? process.env[target.keyEnv.toUpperCase()]

  if (!projectUrl || !adminKey) {
    throw new Error(`${target.urlEnv} ou ${target.keyEnv} manque dans .env.local.`)
  }
  if (!projectUrl.includes(target.ref)) {
    throw new Error(`Arrêt : l’URL ne correspond pas au projet ${target.label}. Aucun compte n’a été modifié.`)
  }
  if (isProduction && !updateAll) {
    throw new Error('Pour éviter toute ambiguïté, le mode production exige les options --production --all.')
  }

  const supabase = createClient(projectUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Impossible de vérifier les utilisateurs sur ${target.label}.`)

  let selectedAccounts = ACCOUNTS
  if (!updateAll) {
    console.log(`Projet vérifié : ${target.label}`)
    ACCOUNTS.forEach((account, index) => {
      console.log(`${index + 1}. ${account.label} — ${account.email}`)
    })
    const selection = await ask('Compte à modifier (1-3) : ')
    const account = ACCOUNTS[Number(selection) - 1]
    if (!account) throw new Error('Choix invalide. Aucun compte n’a été modifié.')
    selectedAccounts = [account]
  } else {
    console.log(`Projet vérifié : ${target.label}`)
    console.log('Comptes ciblés :')
    ACCOUNTS.forEach((account) => console.log(`- ${account.email}`))
  }

  const usersByEmail = new Map(data.users.map((user) => [user.email?.toLowerCase(), user]))
  const selectedUsers = selectedAccounts.map((account) => ({
    account,
    user: usersByEmail.get(account.email),
  }))
  const missingEmails = selectedUsers.filter(({ user }) => !user).map(({ account }) => account.email)
  if (missingEmails.length > 0) {
    throw new Error(`Compte(s) absent(s) sur ${target.label} : ${missingEmails.join(', ')}. Aucun mot de passe n’a été modifié.`)
  }

  if (isProduction) {
    const confirmation = await ask('Pour confirmer la production, tape PRODUCTION : ')
    if (confirmation !== 'PRODUCTION') throw new Error('Confirmation incorrecte. Aucun compte n’a été modifié.')
  }

  let password
  try {
    password = await askMasked('Nouveau mot de passe (8 caractères minimum) : ')
    const confirmation = await askMasked('Confirme le nouveau mot de passe : ')
    if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.')
    if (password !== confirmation) throw new Error('Les deux mots de passe ne correspondent pas.')

    for (const { account, user } of selectedUsers) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password })
      if (updateError) {
        throw new Error(`Échec de la mise à jour pour ${account.email} sur ${target.label}.`)
      }
      console.log(`Mot de passe mis à jour pour ${account.email} sur ${target.label}.`)
    }
  } finally {
    password = null
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Échec de la mise à jour.')
  process.exitCode = 1
})