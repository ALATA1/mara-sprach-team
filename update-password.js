'use strict'

const { loadEnvConfig } = require('@next/env')
const { createClient } = require('@supabase/supabase-js')
const { stdin, stdout } = require('node:process')

const STAGING_PROJECT_REF = 'usyfvtyqnjuflhswrfpg'
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
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!projectUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manque dans .env.local.')
  }
  if (!projectUrl.includes(STAGING_PROJECT_REF)) {
    throw new Error('Arrêt : .env.local ne cible pas ALATA1. Aucun compte n’a été modifié.')
  }

  console.log('Projet vérifié : ALATA1')
  ACCOUNTS.forEach((account, index) => {
    console.log(`${index + 1}. ${account.label} — ${account.email}`)
  })

  const selection = await ask('Compte à modifier (1-3) : ')
  const account = ACCOUNTS[Number(selection) - 1]
  if (!account) throw new Error('Choix invalide. Aucun compte n’a été modifié.')

  let password
  try {
    password = await askMasked('Nouveau mot de passe (8 caractères minimum) : ')
    const confirmation = await askMasked('Confirme le nouveau mot de passe : ')
    if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.')
    if (password !== confirmation) throw new Error('Les deux mots de passe ne correspondent pas.')

    const supabase = createClient(projectUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw new Error('Impossible de vérifier les utilisateurs sur ALATA1.')

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === account.email)
    if (!user) throw new Error(`Le compte ${account.email} est introuvable sur ALATA1.`)

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password })
    if (updateError) throw new Error('Supabase a refusé la mise à jour du mot de passe.')

    console.log(`Mot de passe mis à jour pour ${account.email} sur ALATA1.`)
  } finally {
    password = null
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Échec de la mise à jour.')
  process.exitCode = 1
})