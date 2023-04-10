const chains = {
    42170: ["arbitrum-nova", "0x1c5771e96C9d5524fb6e606f5B356d08C40Eb194", "https://nova.arbitrum.io/rpc"],
    42161: ["arbitrum-mainnet", "0xA7caC4207579A179c1069435d032ee0F9F150e5c", "https://rpc.ankr.com/arbitrum"],
    43114: ["avalanche-mainnet", "0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F", "https://rpc.ankr.com/avalanche"],
    //boba 0x2f686751b19a9d91cc3d57d90150bc767f050066
    56: ["bsc-mainnet", "0xD75F5369724b513b497101fb15211160c1d96550", "https://rpc.ankr.com/bsc"],
    1: ["eth-mainnet", "0x044b75f554b886A065b9567891e45c79542d7357", "https://eth.llamarpc.com"],
    250: ["fantom-mainnet", "0x3e603C14aF37EBdaD31709C4f848Fc6aD5BEc715", "https://rpc.ftm.tools"],
    //fuse 0x2f686751b19a9d91cc3d57d90150Bc767f050066
    //100: ["0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F", "https://rpc.ankr.com/gnosis"], -> not supported by covalent
    //moonbeam 0x1838b053E0223F05FB768fa79aA07Df3f0f27480
    1285: ["moonbeam-moonriver", "0x3d2f8ae0344d38525d2ae96ab750b83480c0844f", "https://rpc.api.moonriver.moonbeam.network"],
    10: ["optimism-mainnet", "0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49", "https://rpc.ankr.com/optimism"],
    137: ["polygon-mainnet", "0x5097CBB61D3C75907656DC4e3bbA892Ff136649a", "https://polygon.llamarpc.com"],
    1101: ["polygon-zkevm-mainnet", "0x93395129bd3fcf49d95730D3C2737c17990fF328", "https://zkevm-rpc.com"],
}

function after(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

function fetchWithRetry(url, attempt = 0, fetchOptions = {}) {
    if (attempt >= 3) {
        return Promise.reject("attempts exceeded");
    }

    return fetch(url,fetchOptions).then(res => {
        if (res.status == 200) {
            return Promise.resolve(res);
        } else if (res.status == 429) {
            const nextAttempt = attempt + 1;
            const delay = Math.pow(2, nextAttempt) * 1000;
            return after(delay).then(() => fetchWithRetry(url, nextAttempt, fetchOptions));
        } else {
            return Promise.reject(res);
        }
    });
}

function checkRunButtonEnable() {
    const addressesInput = document.getElementById("addresses");
    const runButton = document.getElementById("runButton");
    runButton.disabled = addressesInput.value.length === 0;
}

async function run() {
    const startTime = new Date();
    const addressesInput = document.getElementById("addresses");
    const runButton = document.getElementById("runButton");
    const outputLog = document.getElementById("output");

    function appendToLog(text, styleParts={}) {
        const newDiv = document.createElement("div");
        newDiv.innerText = text;
        for ([k, v] of Object.entries(styleParts)) {
            newDiv.style[k] = v;
        }
        outputLog.appendChild(newDiv);
        outputLog.scrollTop = outputLog.scrollHeight;
    }

    runButton.disabled = true;
    outputLog.innerHTML = "";

    const holderAddresses = addressesInput.value.split(/[\s,]+/).map(x => x.trim()).filter(x => x.length > 0)

    for ([chainID, chainConfig] of Object.entries(chains)) {
        const chainName = chainConfig[0];
        const sushiswapRouterAddress = chainConfig[1];
        const provider = new ethers.providers.StaticJsonRpcProvider(chainConfig[2]);

        for (holderAddress of holderAddresses) {
            try{
                const tokens = await after(200).then(() => fetchWithRetry(`https://api.covalenthq.com/v1/${chainID}/address/${holderAddress}/balances_v2/?&key=ckey_72cd3b74b4a048c9bc671f7c5a6`)).then(r=>r.json());

                const filteredTokens = tokens.data.items.filter(t=>t.contract_address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" && t.contract_address !== "0x0000000000000000000000000000000000001010");

                if (filteredTokens.length > 0) {
                    appendToLog(`\nfor your wallet address ${holderAddress} on chain ${chainName} (chainID=${chainID}):`);
                }

                for (token of filteredTokens) {
                    const tokenContract = new ethers.Contract(
                        token.contract_address,
                        [
                            {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
                        ],
                        provider
                    );

                    let token_name_part = "";
                    if (token.contract_ticker_symbol) {
                        token_name_part = `${token.contract_ticker_symbol} (${token.contract_address})`;
                    } else {
                        token_name_part = token.contract_address;
                    }

                    try{
                        const allowance = await tokenContract.allowance(holderAddress, sushiswapRouterAddress);

                        if(allowance > 0){
                            appendToLog(`  ❌ token ${token_name_part}: HAS ALLOWANCE of ${allowance} to Sushiswap Router contract, you should revoke!`, {"font-weight": "bold", "color": "#fff"});
                        } else {
                            appendToLog(`  ✅ token ${token_name_part}: ok`);
                        }
                    } catch(e){
                        appendToLog(`  ❔ token ${token_name_part}: allowance() method not implemented`);
                    }
                }
            } catch(e){
                if (e === "attempts exceeded") {
                    appendToLog(`\n⚠️ failed to probe wallet address ${holderAddress} on chain ${chainName} (chainID=${chainID}); please try again later`);
                }

                console.log("tokens", e);
            }
        }
    }

    const finishTime = new Date();
    const elapsed = (finishTime - startTime) / 1000.0;

    appendToLog(`\n🏁 scan finished (in ${elapsed}s)`);
    runButton.disabled = false;
}
