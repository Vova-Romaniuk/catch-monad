import { EIP1193Provider } from "@privy-io/react-auth";
import Web3 from "web3";

const MONAD_GAME_CONTRACT = "0x7A5dbD0442CB69c038E56a5482b239AE0d64Dd03";

const ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "score",
        type: "uint256",
      },
    ],
    name: "setRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "newUsername",
        type: "string",
      },
    ],
    name: "updateUserName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getLeaderBoard",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "wallet",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "score",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "username",
            type: "string",
          },
        ],
        internalType: "struct MonadGame.ScoreStruct[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRecord",
    outputs: [
      {
        internalType: "uint256",
        name: "rank",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "score",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "username",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export interface ScoreStruct {
  wallet: string;
  score: bigint; // зверніть увагу, що Web3 повертає числа у вигляді рядків
  username: string;
}

// Тип для getRecord()
export interface UserRecord {
  rank: bigint; // теж буде рядком (BigInt), коли викликаємо .call()
  score: bigint;
  username: string;
}

// Описуємо методи, які хочемо викликати з фронтенду
export type GameContractT = {
  contractAddress: string;

  // 1) Встановити/оновити score
  setRecord: (score: number, fromAddress: string) => Promise<unknown>;

  // 2) Оновити username
  updateUserName: (
    newUsername: string,
    fromAddress: string
  ) => Promise<unknown>;

  // 3) Отримати топ-5 гравців
  getLeaderBoard: () => Promise<ScoreStruct[]>;

  // 4) Отримати власний запис (ранг, score, username)
  getRecord: () => Promise<UserRecord>;
};

// Функція ініціалізації контракту
export const initGameContract = async (
  provider: Promise<EIP1193Provider>
): Promise<GameContractT> => {
  // Отримуємо провайдер (наприклад, із Privy або MetaMask)
  const privyProvider = await provider;
  const web3 = new Web3(privyProvider);

  const contractAddress = MONAD_GAME_CONTRACT;
  const contractInstance = new web3.eth.Contract(ABI, contractAddress);

  // -----------------------
  // Методи, що викликають функції контракту
  // -----------------------

  // (1) setRecord(score)
  const setRecord = async (score: number, fromAddress: string) => {
    return contractInstance.methods
      .setRecord(score)
      .send({ from: fromAddress });
  };

  // (2) updateUserName(newUsername)
  const updateUserName = async (newUsername: string, fromAddress: string) => {
    return contractInstance.methods
      .updateUserName(newUsername)
      .send({ from: fromAddress });
  };

  // (3) getLeaderBoard()
  const getLeaderBoard = async (): Promise<ScoreStruct[]> => {
    // Поверне масив ScoreStruct
    return contractInstance.methods.getLeaderBoard().call();
  };

  // (4) getRecord()
  const getRecord = async (): Promise<UserRecord> => {
    const accounts = await web3.eth.getAccounts();
    const sender = accounts[0];

    const result: any = await contractInstance.methods
      .getRecord()
      .call({ from: sender });

    return result;
  };

  // Повертаємо об'єкт із методами
  const contractBehaviour: GameContractT = {
    contractAddress,
    setRecord,
    updateUserName,
    getLeaderBoard,
    getRecord,
  };

  return contractBehaviour;
};
