import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Home.module.css';
import Web3Modal from 'web3modal';
import { BigNumber, Contract, providers, utils } from 'ethers';
import {
    TOKEN_CONTRACT_ADDRESS,
    TOKEN_CONTRACT_ABI,
    NFT_CONTRACT_ADDRESS,
    NFT_CONTRACT_ABI,
} from '../constants';

export default function Home() {
    const zero = BigNumber.from(0);
    const [walletConnected, setWalletConnected] = useState(false);
    const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] =
        useState(zero);
    const [tokensMinted, setTokensMinted] = useState(zero);
    const [loading, setLoading] = useState(false);
    const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
    const [tokenAmount, setTokenAmount] = useState(zero);
    const [isOwner, setIsOwner] = useState(false);
    const web3modalRef = useRef();

    const connectWallet = async () => {
        try {
            await getProviderOrSigner();
            setWalletConnected(true);
        } catch (error) {
            console.log(error);
            setWalletConnected(false);
        }
    };

    const getProviderOrSigner = async (needSigner = false) => {
        const provider = await web3modalRef.current.connect();
        const web3Provider = new providers.Web3Provider(provider);

        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 5) {
            console.log('Please change network to Goerli');
            throw new Error('Change network to Goerli');
        }

        if (needSigner) {
            const signer = web3Provider.getSigner();
            return signer;
        }
        return web3Provider;
    };

    const getBalanceOfCryptoDevTokens = async () => {
        try {
            const signer = await getProviderOrSigner(true);

            const cryptoDevTokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                signer
            );
            const address = await signer.getAddress();
            const balance = await cryptoDevTokenContract.balanceOf(address);
            setBalanceOfCryptoDevTokens(balance);
        } catch (error) {
            console.log(error);
            setBalanceOfCryptoDevTokens(zero);
        }
    };

    const getTokensToBeClaimed = async () => {
        try {
            const signer = await getProviderOrSigner(true);

            const nftContract = new Contract(
                NFT_CONTRACT_ADDRESS,
                NFT_CONTRACT_ABI,
                signer
            );

            const tokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                signer
            );

            const address = await signer.getAddress();
            const balance = await nftContract.balanceOf(address);

            if (balance === zero) {
                setTokensToBeClaimed(zero);
            } else {
                console.log('balance in nft contract:::', balance.toString());
                var amount = 0;
                for (var i = 0; i < balance; i++) {
                    const tokenId = await nftContract.tokenOfOwnerByIndex(
                        address,
                        i
                    );
                    const claimed = await tokenContract.tokenIdsClaimed(
                        tokenId
                    );
                    if (!claimed) {
                        amount++;
                    }
                }
                setTokensToBeClaimed(BigNumber.from(amount));
            }
        } catch (error) {
            console.log(error);
            setTokensToBeClaimed(zero);
        }
    };

    const claimCryptoDevTokens = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const tokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                signer
            );

            const tx = await tokenContract.claim();
            setLoading(true);
            await tx.wait();
            setLoading(false);
            window.alert('Sucessfully claimed Crypto Dev Tokens');
            await getBalanceOfCryptoDevTokens();
            await getTotalTokensMinted();
            await getTokensToBeClaimed();
        } catch (error) {
            console.log(error);
        }
    };

    const getTotalTokensMinted = async () => {
        try {
            const provider = await getProviderOrSigner(false);
            const cryptoDevTokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                provider
            );

            const totalSupply = await cryptoDevTokenContract.totalSupply();
            setTokensMinted(totalSupply);
        } catch (error) {
            console.log(error);
        }
    };

    const mintCryptoDevToken = async amount => {
        try {
            const provider = await getProviderOrSigner(true);
            const cryptoDevTokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                provider
            );
            const value = 0.001 * amount;
            const tx = await cryptoDevTokenContract.mint(amount, {
                value: utils.parseEther(value.toString()),
            });
            setLoading(true);
            await tx.wait();
            setLoading(false);
            window.alert('Sucessfully minted Crypto Dev Tokens');

            await getBalanceOfCryptoDevTokens();
            await getTotalTokensMinted();
            await getTokensToBeClaimed();
        } catch (error) {
            console.log(error);
        }
    };

    const getOwner = async () => {
        try {
            const provider = await getProviderOrSigner();
            const tokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                provider
            );

            const _owner = await tokenContract.owner();
            const signer = await getProviderOrSigner(true);
            const address = await signer.getAddress();
            if (address.toLowerCase() === _owner.toLowerCase()) {
                setIsOwner(true);
            }
        } catch (err) {
            console.error(err.message);
        }
    };

    const withdrawCoins = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const tokenContract = new Contract(
                TOKEN_CONTRACT_ADDRESS,
                TOKEN_CONTRACT_ABI,
                signer
            );

            const tx = await tokenContract.withdraw();
            setLoading(true);
            await tx.wait();
            setLoading(false);
            await getOwner();
        } catch (err) {
            console.error(err);
        }
    };

    const renderButton = () => {
        if (loading) {
            return (
                <div>
                    <button className={styles.button}>Loading...</button>
                </div>
            );
        }

        if (walletConnected && isOwner) {
            return (
                <div>
                    <button className={styles.button1} onClick={withdrawCoins}>
                        Withdraw Coins
                    </button>
                </div>
            );
        }

        if (tokensToBeClaimed > 0) {
            return (
                <div>
                    <div>{tokensToBeClaimed * 10} Tokens can be claimed!</div>
                    <button
                        className={styles.button}
                        onClick={claimCryptoDevTokens}
                    >
                        Claim Tokens
                    </button>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex-col' }}>
                <input
                    className={styles.input}
                    type='number'
                    placeholder='Amount of Tokens'
                    onChange={e =>
                        setTokenAmount(BigNumber.from(e.target.value))
                    }
                />
                <button
                    className={styles.button}
                    onClick={() => mintCryptoDevToken(tokenAmount)}
                >
                    Mint Tokens
                </button>
            </div>
        );
    };

    useEffect(() => {
        if (!walletConnected) {
            web3modalRef.current = new Web3Modal({
                network: 'goerli',
                providerOptions: {},
                disableInjectedProvider: false,
            });
            connectWallet();
            getTotalTokensMinted();
            getBalanceOfCryptoDevTokens();
            getTokensToBeClaimed();
            withdrawCoins();
        }
    }, [walletConnected]);

    return (
        <div className={styles.container}>
            <Head>
                <title>Crypto Devs</title>
                <meta name='description' content='ICO-Dapp' />
                <link rel='icon' href='/favicon.ico' />
            </Head>
            <div className={styles.main}>
                <div>
                    <h1 className={styles.title}>
                        Welcome to Crypto Devs ICO!
                    </h1>
                    <div className={styles.description}>
                        You can claim or mint Crypto Dev tokens here
                    </div>
                    {walletConnected ? (
                        <div>
                            <div>
                                You have minted{' '}
                                {utils.formatEther(balanceOfCryptoDevTokens)}{' '}
                                Crypto Dev Tokens
                            </div>
                            <div>
                                Overall {utils.formatEther(tokensMinted)}/10000
                                have been minted!!!
                            </div>
                            {renderButton()}
                        </div>
                    ) : (
                        <button
                            className={styles.button}
                            onClick={connectWallet}
                        >
                            Connect Wallet
                        </button>
                    )}
                </div>
                <div>
                    <img className={styles.image} src='./0.svg' />
                </div>
            </div>

            <footer className={styles.footer}>
                Made with &#10084; by Crypto Devs
            </footer>
        </div>
    );
}
