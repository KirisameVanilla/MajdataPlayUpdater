﻿using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using MajdataPlayUpdater.ViewModels;
using MajdataPlayUpdater.Views;

namespace MajdataPlayUpdater;

public class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
            desktop.MainWindow = new MainWindow
            {
                DataContext = new UpdaterViewModel()
            };
        else if (ApplicationLifetime is ISingleViewApplicationLifetime singleViewPlatform)
            singleViewPlatform.MainView = new UpdaterView
            {
                DataContext = new UpdaterViewModel()
            };

        base.OnFrameworkInitializationCompleted();
    }
}