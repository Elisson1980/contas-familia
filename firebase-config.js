// ============================================================
//  CONTAS DA FAMÍLIA — ÚNICO ARQUIVO PARA EDITAR
//  Cole abaixo a configuração do seu app Web do Firebase
//  (Console do Firebase > Configurações do projeto > Seus apps > Config).
//  Enquanto apiKey for "COLE_AQUI", o app abre em MODO DEMONSTRAÇÃO
//  (dados de exemplo, salvos só neste aparelho; qualquer PIN de 8 dígitos entra).
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAApFxT0BfWthXhprEGc9DvxzREVQAR8vo",
  authDomain: "contas-familia-96ba4.firebaseapp.com",
  projectId: "contas-familia-96ba4",
  storageBucket: "contas-familia-96ba4.firebasestorage.app",
  messagingSenderId: "83612480784",
  appId: "1:83612480784:web:2718ee9c9880b245316195",
  measurementId: "G-YZHRPWVY8H"
};

// Logins internos: ninguém digita nem vê estes endereços; cada pessoa entra com
// o próprio nome + PIN de 8 dígitos. NÃO precisa editar. Eles só são usados ao
// criar os 4 usuários no Firebase (Authentication > Adicionar usuário).
// example.com é um domínio reservado que não recebe e-mails.
export const LOGINS = {
  elisson: "elisson@contas-familia.example.com",
  ramon:   "ramon@contas-familia.example.com",
  mariele: "mariele@contas-familia.example.com",
  pais:    "pais@contas-familia.example.com"
};
