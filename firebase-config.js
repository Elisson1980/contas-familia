// ============================================================
//  CONTAS DA FAMÍLIA — ÚNICO ARQUIVO PARA EDITAR
//  Cole abaixo a configuração do seu app Web do Firebase
//  (Console do Firebase > Configurações do projeto > Seus apps > Config).
//  Enquanto apiKey for "COLE_AQUI", o app abre em MODO DEMONSTRAÇÃO
//  (dados de exemplo, salvos só neste aparelho; qualquer PIN de 8 dígitos entra).
// ============================================================

export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
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
