import React, { useRef, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import "./App.css";
import { initGameContract } from "./contract";
import useMediaQuery from "./hooks/useMediaQuery";

const MONAD_CHAIN_ID = "10143";

function App() {
  const { wallets } = useWallets();
  const canvasRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [score, setScore] = useState(0);
  const { login, user, logout } = usePrivy();
  const [contract, setContract] = useState(null);
  const [leaderBoard, setLeaderBoard] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

  // scoreRef для актуального значення score у функції draw
  const scoreRef = useRef(score);
  const moleRef = useRef(null);
  const moleTimeoutRef = useRef(null);
  const spawnTimeoutRef = useRef(null);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const isPhone = useMediaQuery("(max-width: 600px)");

  const [canvasSize, setCanvasSize] = useState({
    width: isMobile ? 300 : 450,
    height: isMobile ? 300 : 450,
  });

  // 🛠 Оновлюємо розміри при зміні `isMobile`
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({
        width: isMobile ? 300 : 450,
        height: isMobile ? 300 : 450,
      });
    };

    // Викликаємо функцію при зміні розміру екрану
    window.addEventListener("resize", updateCanvasSize);

    // Виконуємо при першому рендері
    updateCanvasSize();

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [isMobile, isPhone]); // Залежність від `isMobile`

  // Використання

  const moleSize = isPhone ? 50 : 80; // Збільшений розмір кротика
  // Початковий інтервал появи кротика – 3000 мс
  const spawnIntervalRef = useRef(3000);
  const authenticated = user?.wallet;
  // Завантаження SVG для кротика
  const fetchLeaderBoard = async () => {
    const wallet = wallets[0];

    if (wallet) {
      try {
        const record = await contract.getLeaderBoard();
        setLeaderBoard(record);
      } catch (error) {
        console.error("Error fetch leader board:", error);
      }
    }
  };

  const fetchCurrentUserInfo = async () => {
    const wallet = wallets[0];
    if (wallet) {
      try {
        const record = await contract.getRecord();

        setUserInfo(record);
      } catch (error) {
        console.error("Error fetch leader board:", error);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = isMobile ? window.innerWidth - 20 : 450;
        canvasRef.current.height = isMobile ? window.innerHeight / 1.5 : 450;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  const moleImageRef = useRef(new Image());
  useEffect(() => {
    moleImageRef.current.src = "monad.svg";
    const interval = setInterval(() => {
      fetchLeaderBoard();
      fetchCurrentUserInfo();
    }, 5000); // Оновлення кожні 5 секунд

    return () => clearInterval(interval);
    // Замініть на шлях до вашого SVG
  }, []);

  // Оновлюємо scoreRef при зміні score
  useEffect(() => {
    scoreRef.current = score;
    draw();
  }, [score]);

  useEffect(() => {
    if (userInfo?.username) {
      setUserName(userInfo.username);
    }
  }, [userInfo]);
  // Функція малювання канви, сітки та кротика
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const gridRows = 3;
    const gridCols = 3;
    const holeWidth = canvasSize.width / gridCols;
    const holeHeight = canvasSize.height / gridRows;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Малюємо сітку
    ctx.strokeStyle = "gray";
    for (let i = 0; i <= gridCols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * holeWidth, 0);
      ctx.lineTo(i * holeWidth, canvasSize.height);
      ctx.stroke();
    }
    for (let j = 0; j <= gridRows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * holeHeight);
      ctx.lineTo(canvasSize.width, j * holeHeight);
      ctx.stroke();
    }

    // Малюємо кротика, якщо він існує, використовуючи SVG
    if (moleRef.current) {
      const mole = moleRef.current;
      if (moleImageRef.current.complete) {
        ctx.drawImage(
          moleImageRef.current,
          mole.x,
          mole.y,
          mole.width,
          mole.height
        );
      } else {
        // Запасний варіант – малюємо коло
        ctx.fillStyle = "brown";
        ctx.beginPath();
        ctx.arc(
          mole.x + mole.width / 2,
          mole.y + mole.height / 2,
          mole.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  };

  // Функція для появи кротика
  const spawnMonad = () => {
    // Очистити попередній таймаут, якщо існує
    if (moleTimeoutRef.current) clearTimeout(moleTimeoutRef.current);

    const gridRows = 3;
    const gridCols = 3;
    const holeWidth = canvasSize.width / gridCols;
    const holeHeight = canvasSize.height / gridRows;
    const col = Math.floor(Math.random() * gridCols);
    const row = Math.floor(Math.random() * gridRows);

    moleRef.current = {
      x: col * holeWidth + holeWidth / 2 - moleSize / 2,
      y: row * holeHeight + holeHeight / 2 - moleSize / 2,
      width: moleSize,
      height: moleSize,
    };

    draw();

    // Якщо користувач не встигне клікнути протягом spawnIntervalRef.current,
    // вважаємо, що він промахнувся – скидаємо score і інтервал.
    moleTimeoutRef.current = setTimeout(() => {
      setScore(0); // скидаємо streak
      spawnIntervalRef.current = 3000; // повертаємо інтервал до початкового значення
      moleRef.current = null;
      draw();
      // Плануємо появу наступного кротика через spawnIntervalRef.current
      spawnTimeoutRef.current = setTimeout(
        spawnMonad,
        spawnIntervalRef.current
      );
    }, spawnIntervalRef.current);
  };

  // Обробка кліку по Canvas з логуванням координат
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      // Використовуємо e.offsetX та e.offsetY або розраховуємо відносно rect
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (moleRef.current) {
        const mole = moleRef.current;

        if (
          clickX >= mole.x &&
          clickX <= mole.x + mole.width &&
          clickY >= mole.y &&
          clickY <= mole.y + mole.height
        ) {
          clearTimeout(moleTimeoutRef.current); // зупиняємо таймаут зникнення кротика
          setScore((prev) => prev + 1); // збільшуємо streak
          // Зменшуємо інтервал на 50 мс, але не менше 1000 мс
          spawnIntervalRef.current = Math.max(
            1000,
            spawnIntervalRef.current - 50
          );
          moleRef.current = null;
          draw();
          // Скидаємо попередній spawnTimeout та плануємо появу наступного кротика
          if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
          spawnTimeoutRef.current = setTimeout(
            spawnMonad,
            spawnIntervalRef.current
          );
        } else {
        }
      } else {
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Старт гри – плануємо перший виклик spawnMonad
  useEffect(() => {
    spawnTimeoutRef.current = setTimeout(spawnMonad, spawnIntervalRef.current);
    return () => {
      clearTimeout(spawnTimeoutRef.current);
      clearTimeout(moleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const wallet = wallets[0];
    if (wallet && wallet?.chainId !== MONAD_CHAIN_ID) {
      wallet.switchChain(+MONAD_CHAIN_ID);
    }
  }, [wallets]);

  useEffect(() => {
    const wallet = wallets[0];

    const loadContract = async () => {
      if (wallet) {
        try {
          const provider = wallet.getEthereumProvider();
          const contractInstance = await initGameContract(provider);
          setContract(contractInstance);
        } catch (error) {
          console.error("Error loading contract:", error);
        }
      }
    };

    loadContract();
  }, [wallets]);

  useEffect(() => {
    fetchLeaderBoard();
    fetchCurrentUserInfo();
  }, [contract]);

  const sendUserName = async () => {
    const wallet = wallets[0];
    if (wallet) {
      await contract.updateUserName(userName, wallet.address);
    } else {
      login();
    }
  };

  const sendUserRank = async () => {
    const wallet = wallets[0];
    if (wallet) {
      await contract.setRecord(score, wallet.address);
    } else {
      login();
    }
  };

  const setName = (newUsername) => {
    const trimmed = newUsername.trim();

    if (!trimmed) {
      return;
    }

    setUserName(newUsername);
  };
  const logOut = () => {
    logout();
    setUserName("");
    setUserInfo(null);
  };
  return (
    <div className='h-screen w-full relative flex flex-col overflow-hidden stardos-stencil-regular'>
      <div
        className={`absolute left-0 -top-10 flex w-full -z-10 ${
          isPhone && "!top-0"
        }`}>
        <img src='wave-top.svg' className='w-full h-full' alt='wave top' />
      </div>
      <div
        className={`absolute left-0 -bottom-10 flex w-full -z-10 ${
          isPhone && "!bottom-0"
        }`}>
        <img className='w-full' src='wave-bottom.svg' alt='wave bottom' />
      </div>
      <div className='h-[10%] w-full mt-0 mb-auto flex z-30'>
        <div
          className={`flex ml-auto mb-3 h-10 mt-3 mr-5 ${
            isPhone && "!mb-2 !mr-3"
          }`}>
          <input
            type='text'
            value={userName}
            onChange={(e) => setName(e.target.value)}
            className={`flex rounded-2xl duration-200 text-[#676FFF] placeholder:text-[#676FFF]/80  bg-white cursor-pointer items-center h-10 py-1 px-4 z-20 shadow-md ${
              isPhone &&
              "!w-28  !px-2 !text-sm placeholder:!text-sm !h-8 !rounded:xl"
            }`}
            name=''
            placeholder='Input your nick name'
            id=''
          />
          <button
            className={`bg-[#676FFF] text-white hover:bg-[#735ce0] border-white border-[1px] px-4 py-2 shadow-md ml-3 transition-colors cursor-pointer rounded-2xl disabled:cursor-not-allowed ${
              isPhone && "!h-8 !py-1 !text:sm !rounded:xl"
            }`}
            disabled={userName ? false : true}
            onClick={sendUserName}>
            set
          </button>
        </div>
        {authenticated ? (
          <div
            className={`text-center cursor-pointer flex ml-6 mb-3 h-10 mt-3 mr-5 ${
              isPhone && "!ml-3 !h-8 !mr-3"
            }`}>
            <div
              className={`flex rounded-2xl duration-200 text-[#676FFF] bg-white cursor-pointer items-center h-10 py-1 px-4 z-20 shadow-md ${
                isPhone && "!h-8 !px-2 !text-xs"
              }`}>
              <i
                className={`fa-solid fa-wallet text-lg text-[#676FFF] mr-3 ${
                  isPhone && "!text-sm"
                }`}></i>
              <span className='main-font text-center align-middle flex'>
                {shortenAddress(user?.wallet?.address)}
              </span>
            </div>

            <button
              onClick={logOut}
              className={`ml-5 cursor-pointer px-6 py-2 rounded-md text-lg ${
                isPhone && "!text-sm !px-3 !py-1 !ml-2"
              }`}>
              <i className='fa-solid fa-right-from-bracket text-white hover:scale-110'></i>
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className={`ml-6 mb-3 h-10 mt-3 mr-5 flex rounded-2xl duration-200 text-[#676FFF] bg-white py-2 px-5 cursor-pointer shadow-md ${
              isPhone && "!ml-3 !h-8 !text-sm"
            }`}>
            Connect
          </button>
        )}
      </div>

      {isMobile ? (
        <div className='h-[80%] flex flex-col w-full z-50'>
          <div className='w-10/12 flex flex-col m-auto'>
            <div className='flex w-full justify-evenly h-[40%]'>
              <div className='w-5/12 flex flex-col items-center justify-center h-full'>
                <div
                  className={`bg-black/70 w-60 p-6 text-white rounded-lg flex flex-col items-center mb-10 ${
                    isPhone && "!w-32 !p-3 !mb-5"
                  }`}>
                  <div className='mb-4'>
                    <p className={`text-xl ${isPhone && "!text-base"}`}>
                      Your rank: {userInfo?.rank}
                    </p>
                  </div>
                  <div className='mb-4'>
                    <p className={`text-xl ${isPhone && "!text-base"}`}>
                      Your score: {userInfo?.score}
                    </p>
                  </div>
                </div>
                <div
                  className={`bg-black/70 w-60 p-6 text-white rounded-lg flex flex-col items-center mb-10 ${
                    isPhone && "!w-32 !p-3 !mb-5"
                  }`}>
                  <div className='mb-4'>
                    <p className={`text-xl ${isPhone && "!text-base"}`}>
                      Your score: {score}
                    </p>
                  </div>
                  <button
                    className={`bg-[#676FFF] text-white px-4 py-2 hover:bg-[#735ce0] transition-colors cursor-pointer rounded-2xl ${
                      isPhone && "!text-base !px-3 !py-1"
                    }`}
                    onClick={sendUserRank}>
                    Send result
                  </button>
                </div>
              </div>
              <div className='w-6/12 h-full flex flex-col items-center justify-center '>
                <div
                  className={`bg-black/70 p-6 text-white rounded-xl ${
                    isPhone && "!p-3"
                  }`}>
                  <p
                    className={`text-2xl font-bold text-[#676FFF] text-shadow stardos-stencil-bold ${
                      isPhone && "!text-lg font-medium"
                    }`}>
                    Top catchers:
                  </p>
                  <ol
                    className={`mt-4 list-decimal ml-6 ${
                      isPhone && "!ml-3 !mt-2 !text-xs"
                    }`}>
                    {leaderBoard?.map((player, index) => (
                      <li key={index} className='py-1 border-b border-white'>
                        Nickname: {player.username || "Anonymous"} Score:{" "}
                        {player.score}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            <div className='w-10/12 z-50 mx-auto'>
              <p
                className={`text-5xl text-center mt-6 text-[#676FFF] drop-shadow-2xl font-medium text-shadow stardos-stencil-bold ${
                  isPhone && "!text-4xl "
                }`}>
                Catch monad!
              </p>
              <div className='w-[301px] h-[330px] overflow-hidden z-50'>
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  style={{
                    border: "1px solid black",
                    display: "block",
                    margin: "20px auto",
                    cursor: "pointer",
                    zIndex: "20",
                  }}></canvas>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='h-[80%] flex flex-col w-full z-50'>
          <div className='w-10/12 flex m-auto'>
            <div className='w-3/12 flex flex-col items-center justify-center h-full'>
              <div className='bg-black/70 w-60 p-6 text-white rounded-lg flex flex-col items-center mb-10'>
                <div className='mb-4'>
                  <p className='text-xl'>Your rank: {userInfo?.rank}</p>
                </div>
                <div className='mb-4'>
                  <p className='text-xl'>Your score: {userInfo?.score}</p>
                </div>
              </div>
              <div className='bg-black/70 w-60 p-6 text-white rounded-lg flex flex-col items-center'>
                <div className='mb-4'>
                  <p className='text-xl'>Your score: {score}</p>
                </div>
                <button
                  className='bg-[#676FFF] text-white px-4 py-2 hover:bg-[#735ce0] transition-colors cursor-pointer rounded-2xl'
                  onClick={sendUserRank}>
                  Send result
                </button>
              </div>
            </div>
            <div className='w-6/12 z-50'>
              <p className='text-5xl text-center text-[#676FFF] drop-shadow-2xl font-medium text-shadow stardos-stencil-bold'>
                Catch monad!
              </p>
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                style={{
                  border: "1px solid black",
                  display: "block",
                  margin: "20px auto",
                  cursor: "pointer",
                  zIndex: "20",
                }}></canvas>
            </div>
            <div className='w-3/12 flex flex-col items-center justify-center h-full'>
              <div className='bg-black/70 p-6 text-white rounded-xl'>
                <p className='text-2xl font-bold text-[#676FFF] text-shadow stardos-stencil-bold'>
                  Top catchers:
                </p>
                <ol className='mt-4 list-decimal ml-6'>
                  {leaderBoard?.map((player, index) => (
                    <li key={index} className='py-1 border-b border-white'>
                      Nickname: {player.username || "Anonymous"} Score:{" "}
                      {player.score}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='h-[10%] w-full mt-0 mb-auto flex z-30'></div>
    </div>
  );
}

export default App;
