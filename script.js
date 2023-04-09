const contracts = {
    42170: ["0x1c5771e96C9d5524fb6e606f5B356d08C40Eb194", "https://nova.arbitrum.io/rpc"],
    42161: ["0xA7caC4207579A179c1069435d032ee0F9F150e5c", "https://rpc.ankr.com/arbitrum"],
    43114: ["0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F", "https://rpc.ankr.com/avalanche"],
    //boba 0x2f686751b19a9d91cc3d57d90150bc767f050066
    56: ["0xD75F5369724b513b497101fb15211160c1d96550", "https://rpc.ankr.com/bsc"],
    1: ["0x044b75f554b886A065b9567891e45c79542d7357", "https://eth.llamarpc.com"],
    250: ["0x3e603C14aF37EBdaD31709C4f848Fc6aD5BEc715", "https://rpc.ftm.tools"],
    //fuse 0x2f686751b19a9d91cc3d57d90150Bc767f050066
    //100: ["0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F", "https://rpc.ankr.com/gnosis"], -> not supported by covalent
    //moonbeam 0x1838b053E0223F05FB768fa79aA07Df3f0f27480
    1285: ["0x3d2f8ae0344d38525d2ae96ab750b83480c0844f", "https://rpc.api.moonriver.moonbeam.network"],
    10: ["0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49", "https://rpc.ankr.com/optimism"],
    137: ["0x5097CBB61D3C75907656DC4e3bbA892Ff136649a", "https://polygon.llamarpc.com"],
    1101: ["0x93395129bd3fcf49d95730D3C2737c17990fF328", "https://zkevm-rpc.com"],
}

async function run() {
    const addresses = document.getElementById("addresses").value.split("\n").map(a=>a.trim())
    Object.entries(contracts).forEach(async ([chainId, contract])=>{
        const provider = new ethers.providers.StaticJsonRpcProvider(contract[1])
        addresses.forEach(async address=>{
            try{
                const tokens = await fetch(`https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?&key=ckey_72cd3b74b4a048c9bc671f7c5a6`).then(r=>r.json())
                tokens.data.items.filter(t=>t.contract_address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee").forEach(async token=>{
                    const tokenContract = new ethers.Contract(
                        token.contract_address,
                        [
                            {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
                        ],
                        provider
                    )
                    try{
                    const allowance = await tokenContract.allowance(address, contract[0])
                    if(allowance > 0){
                        document.getElementById("output").value += `You need to revoke ${token.contract_ticker_symbol} on chain with chainId ${chainId} for address ${address}\n`
                    }
                    } catch(e){
                        console.log("allowance", e)
                    }
                })
            } catch(e){
                console.log("tokens", e)
            }
        })
    })
}