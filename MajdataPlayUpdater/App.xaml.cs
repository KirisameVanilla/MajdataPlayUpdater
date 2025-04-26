using System.Net;
using System.Net.Http;
using System.Windows;

namespace MajdataPlayUpdater;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    public static HttpClient HttpClient { get; set; }

    static App()
    {
        HttpClient = new HttpClient();
    }

    public static void RecreateHttpClientWithProxy(string proxyUrl)
    {
        HttpClient?.Dispose();

        if (proxyUrl.Trim() == string.Empty)
        {
            HttpClient = new HttpClient();
        }
        else
        {
            var handler = new HttpClientHandler
            {
                Proxy = new WebProxy(proxyUrl),
                UseProxy = true
            };
            HttpClient = new HttpClient(handler);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        HttpClient.Dispose();
        base.OnExit(e);
    }
}
